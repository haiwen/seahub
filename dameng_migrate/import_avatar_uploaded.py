#!/usr/bin/env python3
"""Import a MySQL avatar_uploaded data dump into Dameng through dmPython.

The source dump must be generated with --no-create-info --complete-insert
--skip-extended-insert. CLOB data is passed as a bound parameter, so Base64
avatar data never becomes part of a large SQL statement.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

INSERT_PREFIX = re.compile(
    r"^INSERT\s+(?:IGNORE\s+)?INTO\s+`(?P<table>(?:``|[^`])+?)`"
    r"(?P<before_values>.*?)\bVALUES\b",
    re.IGNORECASE | re.DOTALL,
)
BACKTICK_IDENTIFIER = re.compile(r"`((?:``|[^`])+)`")
REQUIRED_COLUMNS = ("FILENAME", "FILENAME_MD5", "DATA", "SIZE", "MTIME")
MYSQL_EXECUTABLE_COMMENT = re.compile(r"^/\*!.*?\*/$", re.DOTALL)
MYSQL_LOCK_OR_SET = re.compile(
    r"^(?:LOCK\s+TABLES|UNLOCK\s+TABLES|SET\s+|ALTER\s+TABLE\s+.*?\s+(?:DISABLE|ENABLE)\s+KEYS\s*$)",
    re.IGNORECASE | re.DOTALL,
)


def split_statements(sql: str) -> list[str]:
    """Split SQL on semicolons outside MySQL string literals and identifiers."""
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


def split_values(values: str) -> list[str]:
    """Split one VALUES tuple on commas outside MySQL string literals."""
    fields: list[str] = []
    start = 0
    quote = False
    escaped = False

    for index, char in enumerate(values):
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == "'":
                quote = False
        elif char == "'":
            quote = True
        elif char == ",":
            fields.append(values[start:index])
            start = index + 1

    fields.append(values[start:])
    return fields


def parse_mysql_string(value: str) -> str:
    """Decode the MySQL single-quoted literal formats relevant to this dump."""
    value = value.strip()
    if not (value.startswith("'") and value.endswith("'")):
        raise ValueError(f"expected a quoted string value, got {value[:80]!r}")

    content = value[1:-1]
    result: list[str] = []
    index = 0
    escapes = {"0": "\0", "b": "\b", "n": "\n", "r": "\r", "t": "\t", "Z": "\x1a"}
    while index < len(content):
        char = content[index]
        if char == "\\" and index + 1 < len(content):
            index += 1
            escaped = content[index]
            result.append(escapes.get(escaped, escaped))
        elif char == "'" and index + 1 < len(content) and content[index + 1] == "'":
            result.append("'")
            index += 1
        else:
            result.append(char)
        index += 1
    return "".join(result)


def parse_avatar_insert(statement: str) -> tuple[str, str, str, int, str]:
    match = INSERT_PREFIX.match(statement)
    if not match or match.group("table").replace("``", "`").upper() != "AVATAR_UPLOADED":
        raise ValueError("statement is not an AVATAR_UPLOADED INSERT")

    values_match = re.search(r"\bVALUES\b", statement, re.IGNORECASE)
    assert values_match is not None
    values = statement[values_match.end():].strip()
    if not (values.startswith("(") and values.endswith(")")):
        raise ValueError("AVATAR_UPLOADED dump must have one row per INSERT")

    columns = [column.replace("``", "`").upper() for column in BACKTICK_IDENTIFIER.findall(match.group("before_values"))]
    fields = split_values(values[1:-1])
    if len(columns) != len(fields) or set(columns) != set(REQUIRED_COLUMNS):
        raise ValueError("AVATAR_UPLOADED INSERT has unexpected columns or values")

    data = dict(zip(columns, fields))
    try:
        return (
            parse_mysql_string(data["FILENAME"]),
            parse_mysql_string(data["FILENAME_MD5"]),
            parse_mysql_string(data["DATA"]),
            int(data["SIZE"].strip()),
            parse_mysql_string(data["MTIME"]),
        )
    except (KeyError, ValueError) as error:
        raise ValueError(f"invalid AVATAR_UPLOADED row: {error}") from error


def parse_connection(connection: str) -> tuple[str, str, str, int]:
    """Parse the USER/PASSWORD@HOST:PORT format used by the shell import scripts."""
    try:
        credentials, address = connection.rsplit("@", 1)
        user, password = credentials.split("/", 1)
        server, port = address.rsplit(":", 1)
        return user, password, server, int(port)
    except ValueError as error:
        raise ValueError("connection must be USER/PASSWORD@HOST:PORT") from error


def is_ignorable(statement: str) -> bool:
    return bool(MYSQL_EXECUTABLE_COMMENT.match(statement) or MYSQL_LOCK_OR_SET.match(statement))


def import_file(source: Path, connection: str, batch_size: int) -> int:
    try:
        import dmPython
    except ImportError as error:
        raise RuntimeError("dmPython is required; install the Dameng Python driver first") from error

    user, password, server, port = parse_connection(connection)
    conn = dmPython.connect(user=user, password=password, server=server, port=port)
    cursor = conn.cursor()
    insert_sql = (
        'INSERT INTO "AVATAR_UPLOADED" '
        '("FILENAME", "FILENAME_MD5", "DATA", "SIZE", "MTIME") '
        'VALUES (?, ?, ?, ?, ?)' 
    )
    imported = 0
    pending = 0

    try:
        for number, statement in enumerate(split_statements(source.read_text(encoding="utf-8-sig")), start=1):
            if not statement:
                continue
            if is_ignorable(statement):
                continue
            try:
                row = parse_avatar_insert(statement)
            except ValueError as error:
                raise ValueError(f"statement {number}: {error}") from error
            cursor.execute(insert_sql, row)
            imported += 1
            pending += 1
            if pending >= batch_size:
                conn.commit()
                pending = 0
                print(f"Imported {imported} rows", file=sys.stderr)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

    return imported


def main() -> int:
    parser = argparse.ArgumentParser(description="Import a MySQL avatar_uploaded dump into Dameng with dmPython.")
    parser.add_argument("source", type=Path, help="MySQL avatar_uploaded data-only SQL file")
    parser.add_argument("connection", help="Dameng connection: USER/PASSWORD@HOST:PORT")
    parser.add_argument("--batch-size", type=int, default=100, help="rows committed per transaction (default: 100)")
    args = parser.parse_args()

    if not args.source.is_file():
        parser.error(f"source file not found: {args.source}")
    if args.batch_size <= 0:
        parser.error("--batch-size must be greater than zero")

    try:
        imported = import_file(args.source, args.connection, args.batch_size)
    except Exception as error:
        print(f"Import failed: {error}", file=sys.stderr)
        return 1

    print(f"Imported {imported} AVATAR_UPLOADED row(s) from {args.source}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
