#!/usr/bin/env python3
"""Convert one MySQL data-only dump into Dameng MySQL-compatible INSERT SQL.

The target schema in dameng.sql uses quoted uppercase identifiers, so this script
converts only table and column identifiers in INSERT headers. It intentionally
preserves VALUES clauses byte-for-byte (except UTF-8 decoding/encoding), which
keeps Chinese paths, NULL values, and MySQL string escapes intact.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

MYSQL_EXECUTABLE_COMMENT = re.compile(r"^/\*!.*?\*/$", re.DOTALL)
MYSQL_LOCK_OR_SET = re.compile(
    r"^(?:LOCK\s+TABLES|UNLOCK\s+TABLES|SET\s+|ALTER\s+TABLE\s+.*?\s+(?:DISABLE|ENABLE)\s+KEYS\s*$)",
    re.IGNORECASE | re.DOTALL,
)
INSERT_PREFIX = re.compile(
    r"^(?P<intro>INSERT\s+(?:IGNORE\s+)?INTO\s+)(?P<table>`(?:``|[^`])+`)(?P<before_values>.*?)\bVALUES\b",
    re.IGNORECASE | re.DOTALL,
)
BACKTICK_IDENTIFIER = re.compile(r"`((?:``|[^`])+)`")

# The deployed Dameng schema has quoted lowercase physical column names in
# several legacy tables. Only INSERT column lists are remapped; VALUES remain
# untouched.
COLUMN_RENAMES = {
    "FILEHISTORY": {"SIZE": "size"},
    "FILETRASH": {"USER": "USERNAME", "SIZE": "FILE_SIZE"},
    "FILEAUDIT": {"USER": "user"},
    "FILEUPDATE": {"USER": "user"},
    "PERMAUDIT": {"TO": "to"},
    "FILEOPSSTAT": {"NUMBER": "number"},
    "USERTRAFFIC": {"USER": "user", "SIZE": "size"},
    "SYSTRAFFIC": {"SIZE": "size"},
    "MONTHLYUSERTRAFFIC": {"USER": "user"},
    # from seafile/ccnet
    "ORGREPO": {"USER": "user"},
    "FOLDERUSERPERM": {"USER": "user"},
    "USERDOWNLOADRATELIMIT": {"USER": "user"},
    "USERUPLOADRATELIMIT": {"USER": "user"},
    "USERQUOTA": {"USER": "user"},
    "USERSHAREQUOTA": {"USER": "user"},
    "ORGUSERQUOTA": {"USER": "user"},
}

TABLE_RENAMES = {
    "GROUP": "Group",
}

JSON_COLUMNS = {
    "ACTIVITY": {"DETAIL"},
    "ADMIN_LOG_ADMINLOG": {"DETAIL"},
    "NOTIFICATIONS_USERNOTIFICATION": {"DETAIL"},
    "SDOC_NOTIFICATION": {"DETAIL"},
}

# disql rejects oversized SQL statements. Avatar data is Base64 text and can be
# safely appended to a CLOB in small literals instead of one large INSERT.
AVATAR_UPLOADED_TABLE = "AVATAR_UPLOADED"
DEFAULT_LOB_CHUNK_SIZE = 8000


def split_statements(sql: str) -> list[str]:
    """Split SQL on semicolons outside quoted strings and identifiers."""
    statements: list[str] = []
    start = 0
    quote: str | None = None
    escaped = False

    for index, char in enumerate(sql):
        if quote:
            if escaped:
                escaped = False
            elif char == "\\" and quote in ("'", '"'):
                escaped = True
            elif char == quote:
                if quote == "`" and index + 1 < len(sql) and sql[index + 1] == "`":
                    continue
                quote = None
            continue

        if char in ("'", '"', "`"):
            quote = char
        elif char == ";":
            statement = sql[start:index].strip()
            if statement:
                statements.append(statement)
            start = index + 1

    remainder = sql[start:].strip()
    if remainder:
        statements.append(remainder)
    return statements


def target_identifier(match: re.Match[str]) -> str:
    identifier = match.group(1).replace("``", "`")
    return '"' + identifier.upper().replace('"', '""') + '"'


def split_values(values: str) -> list[str]:
    """Split one VALUES tuple on commas outside MySQL string literals."""
    fields: list[str] = []
    start = 0
    quote: str | None = None
    escaped = False

    for index, char in enumerate(values):
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char == "'":
            quote = char
        elif char == ",":
            fields.append(values[start:index])
            start = index + 1

    fields.append(values[start:])
    return fields


def convert_json_value(value: str) -> str:
    """Make MySQL's escaped JSON quotes valid in Dameng string literals."""
    stripped = value.strip()
    if not (stripped.startswith("'") and stripped.endswith("'")):
        return value

    content = stripped[1:-1].replace('\\"', '"')
    return value[:len(value) - len(value.lstrip())] + "'" + content + "'" + value[len(value.rstrip()):]


def convert_special_values(statement: str, table: str, columns: list[str]) -> str:
    json_columns = JSON_COLUMNS.get(table, set())
    if not json_columns:
        return statement

    values_index = re.search(r"\bVALUES\b", statement, re.IGNORECASE)
    if not values_index:
        return statement

    values = statement[values_index.end():].strip()
    if not (values.startswith("(") and values.endswith(")")):
        return statement

    fields = split_values(values[1:-1])
    if len(fields) != len(columns):
        raise ValueError(f"{table} INSERT column count does not match VALUES count")

    for index, column in enumerate(columns):
        if column in json_columns:
            fields[index] = convert_json_value(fields[index])

    return statement[:values_index.end()] + " (" + ",".join(fields) + ")"


def convert_avatar_uploaded_insert(statement: str, chunk_size: int) -> str:
    """Convert one avatar row into a short INSERT followed by CLOB updates."""
    match = INSERT_PREFIX.match(statement)
    if not match:
        raise ValueError("not an INSERT statement")

    values_match = re.search(r"\bVALUES\b", statement, re.IGNORECASE)
    if not values_match:
        raise ValueError("AVATAR_UPLOADED INSERT has no VALUES clause")

    values = statement[values_match.end():].strip()
    if not (values.startswith("(") and values.endswith(")")):
        raise ValueError(
            "AVATAR_UPLOADED must use single-row INSERT statements; "
            "export with --skip-extended-insert"
        )

    columns = [
        column.replace("``", "`").upper()
        for column in BACKTICK_IDENTIFIER.findall(match.group("before_values"))
    ]
    fields = split_values(values[1:-1])
    if len(fields) != len(columns):
        raise ValueError("AVATAR_UPLOADED INSERT column count does not match VALUES count")

    field_by_column = dict(zip(columns, fields))
    required_columns = {"FILENAME", "FILENAME_MD5", "DATA", "SIZE", "MTIME"}
    if set(field_by_column) != required_columns:
        raise ValueError("AVATAR_UPLOADED INSERT has unexpected columns")

    data = field_by_column["DATA"].strip()
    if not (data.startswith("'") and data.endswith("'")):
        raise ValueError("AVATAR_UPLOADED DATA must be a quoted Base64 string")
    data = data[1:-1]

    result = [
        'INSERT INTO "AVATAR_UPLOADED" '
        '("FILENAME", "FILENAME_MD5", "DATA", "SIZE", "MTIME") VALUES '
        f'({field_by_column["FILENAME"]}, {field_by_column["FILENAME_MD5"]}, '
        f"TO_CLOB(''), {field_by_column['SIZE']}, {field_by_column['MTIME']});\n"
    ]
    filename_md5 = field_by_column["FILENAME_MD5"]
    for start in range(0, len(data), chunk_size):
        chunk = data[start:start + chunk_size]
        result.append(
            'UPDATE "AVATAR_UPLOADED" SET "DATA" = "DATA" || '
            f"TO_CLOB('{chunk}') WHERE \"FILENAME_MD5\" = {filename_md5};\n"
        )
    return "".join(result)


def convert_insert(statement: str, lob_chunk_size: int) -> str:
    match = INSERT_PREFIX.match(statement)
    if not match:
        raise ValueError("not an INSERT statement")

    source_table = match.group("table")[1:-1].replace("``", "`").upper()
    if source_table == AVATAR_UPLOADED_TABLE:
        return convert_avatar_uploaded_insert(statement, lob_chunk_size)

    # before_values contains only whitespace and an optional explicit column list.
    # Convert identifiers here only; do not alter quoted values after VALUES.
    table = target_identifier(re.match(r"`((?:``|[^`])+)`", match.group("table")))
    table = '"' + TABLE_RENAMES.get(table[1:-1], table[1:-1]) + '"'
    column_renames = COLUMN_RENAMES.get(table[1:-1], {})
    columns: list[str] = []

    def target_column(match: re.Match[str]) -> str:
        column = target_identifier(match)
        column = column_renames.get(column[1:-1], column[1:-1])
        columns.append(column)
        return '"' + column + '"'

    converted_header = BACKTICK_IDENTIFIER.sub(target_column, match.group("before_values"))
    statement = convert_special_values(statement, table[1:-1], columns)
    values_start = re.search(r"\bVALUES\b", statement, re.IGNORECASE)
    return (
        match.group("intro")
        + table
        + converted_header
        + statement[values_start.start():]
        + ";\n"
    )


def is_ignorable(statement: str) -> bool:
    return bool(MYSQL_EXECUTABLE_COMMENT.match(statement) or MYSQL_LOCK_OR_SET.match(statement))


def convert_file(source: Path, target: Path, lob_chunk_size: int) -> tuple[int, int]:
    sql = source.read_text(encoding="utf-8-sig")
    converted: list[str] = [
        "-- Converted from MySQL data-only dump for Dameng MySQL compatibility mode.\n",
        "-- Identifiers are double-quoted uppercase to match the supplied Dameng DDL.\n\n",
        "-- Keep ampersands in MySQL text values from triggering disql substitution.\n",
        "SET DEFINE OFF;\n\n",
        "SET ECHO OFF;\n",
        "SET FEEDBACK OFF;\n",
        "SET TIMING OFF;\n\n",
    ]
    inserts = 0
    skipped = 0

    for number, statement in enumerate(split_statements(sql), start=1):
        if is_ignorable(statement):
            skipped += 1
            continue
        if not re.match(r"^INSERT\s+(?:IGNORE\s+)?INTO\b", statement, re.IGNORECASE):
            raise ValueError(
                f"Statement {number} is not a data INSERT. Export with "
                "mysqldump --no-create-info --complete-insert "
                "--skip-extended-insert first."
            )
        converted.append(convert_insert(statement, lob_chunk_size))
        inserts += 1

    target.write_text("".join(converted), encoding="utf-8", newline="\n")
    return inserts, skipped


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert one MySQL data-only dump to Dameng MySQL-compatible INSERT SQL."
    )
    parser.add_argument("source", type=Path, help="MySQL single-table data-only .sql file")
    parser.add_argument("target", type=Path, help="output Dameng .sql file")
    parser.add_argument(
        "--lob-chunk-size",
        type=int,
        default=DEFAULT_LOB_CHUNK_SIZE,
        help=f"characters appended per AVATAR_UPLOADED CLOB statement (default: {DEFAULT_LOB_CHUNK_SIZE})",
    )
    args = parser.parse_args()

    if not args.source.is_file():
        parser.error(f"source file not found: {args.source}")
    if args.source.resolve() == args.target.resolve():
        parser.error("source and target must be different files")
    if args.lob_chunk_size <= 0:
        parser.error("--lob-chunk-size must be greater than zero")

    try:
        inserts, skipped = convert_file(args.source, args.target, args.lob_chunk_size)
    except (OSError, UnicodeDecodeError, ValueError) as error:
        print(f"Conversion failed: {error}", file=sys.stderr)
        return 1

    print(f"Converted {inserts} INSERT statement(s); skipped {skipped} MySQL control statement(s).")
    print(f"Output: {args.target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
