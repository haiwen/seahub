#!/usr/bin/env python3
"""Migrate one table from MySQL to Dameng through parameter binding.

This bypasses disql and binds every value through dmPython. It is suitable for
normal tables and large TEXT/CLOB fields, including AVATAR_UPLOADED.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass

# Keep these mappings local so this importer can run independently from the
# SQL-file conversion workflow.
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


@dataclass(frozen=True)
class DbConnection:
    host: str
    port: int
    user: str
    password: str
    database: str | None = None


def quote_mysql(identifier: str) -> str:
    return "`" + identifier.replace("`", "``") + "`"


def quote_dm(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def parse_connection(value: str, include_database: bool) -> DbConnection:
    """Parse USER/PASSWORD@HOST:PORT[/DATABASE] without logging credentials."""
    try:
        credentials, address = value.rsplit("@", 1)
        user, password = credentials.split("/", 1)
        if include_database:
            address, database = address.rsplit("/", 1)
        else:
            database = None
        host, port = address.rsplit(":", 1)
        return DbConnection(host, int(port), user, password, database)
    except ValueError as error:
        suffix = "/DATABASE" if include_database else ""
        raise ValueError(f"connection must be USER/PASSWORD@HOST:PORT{suffix}") from error


def target_table(source_table: str) -> str:
    return TABLE_RENAMES.get(source_table.upper(), source_table.upper())


def target_columns(source_table: str, source_columns: list[str]) -> list[str]:
    renames = COLUMN_RENAMES.get(target_table(source_table), {})
    return [renames.get(column.upper(), column.upper()) for column in source_columns]


def get_source_columns(cursor, table: str) -> list[str]:
    cursor.execute(f"SHOW COLUMNS FROM {quote_mysql(table)}")
    columns = [row[0] for row in cursor.fetchall()]
    if not columns:
        raise ValueError(f"MySQL table not found or has no columns: {table}")
    return columns


def prepare_sql(source_table: str, source_columns: list[str]) -> tuple[str, str]:
    target = target_table(source_table)
    columns = target_columns(source_table, source_columns)
    select_sql = "SELECT " + ", ".join(quote_mysql(column) for column in source_columns)
    select_sql += f" FROM {quote_mysql(source_table)}"
    insert_sql = f"INSERT INTO {quote_dm(target)} ("
    insert_sql += ", ".join(quote_dm(column) for column in columns)
    insert_sql += ") VALUES (" + ", ".join("?" for _ in columns) + ")"
    return select_sql, insert_sql


def connect_mysql(connection: DbConnection):
    try:
        import pymysql
    except ImportError as error:
        raise RuntimeError("pymysql is required; install it before running the importer") from error
    return pymysql.connect(
        host=connection.host,
        port=connection.port,
        user=connection.user,
        password=connection.password,
        database=connection.database,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.SSCursor,
        autocommit=False,
    )


def connect_dameng(connection: DbConnection):
    try:
        import dmPython
    except ImportError as error:
        raise RuntimeError("dmPython is required; install the Dameng Python driver first") from error
    return dmPython.connect(
        user=connection.user,
        password=connection.password,
        server=connection.host,
        port=connection.port,
    )


def migrate_table(
    source_table: str,
    mysql: DbConnection,
    dameng: DbConnection,
    batch_size: int,
    truncate_target: bool,
) -> int:
    mysql_conn = connect_mysql(mysql)
    dm_conn = connect_dameng(dameng)
    mysql_cursor = mysql_conn.cursor()
    dm_cursor = dm_conn.cursor()
    committed = 0

    try:
        source_columns = get_source_columns(mysql_cursor, source_table)
        select_sql, insert_sql = prepare_sql(source_table, source_columns)
        target = target_table(source_table)

        if truncate_target:
            dm_cursor.execute(f"TRUNCATE TABLE {quote_dm(target)}")
            dm_conn.commit()

        mysql_cursor.execute(select_sql)
        batch = []
        for row in mysql_cursor:
            batch.append(row)
            if len(batch) == batch_size:
                dm_cursor.executemany(insert_sql, batch)
                dm_conn.commit()
                committed += len(batch)
                batch.clear()
                print(f"{source_table}: committed {committed} rows", file=sys.stderr)

        if batch:
            dm_cursor.executemany(insert_sql, batch)
            dm_conn.commit()
            committed += len(batch)

    except Exception:
        dm_conn.rollback()
        raise RuntimeError(
            f"{source_table}: import failed after {committed} committed rows. "
            "Use --truncate-target to restart this table, or resolve the error before retrying."
        ) from None
    finally:
        mysql_cursor.close()
        dm_cursor.close()
        mysql_conn.close()
        dm_conn.close()

    return committed


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate one MySQL table into Dameng with dmPython.")
    parser.add_argument("table", help="source MySQL table name")
    parser.add_argument(
        "--mysql",
        default=os.environ.get("MYSQL_CONNECTION"),
        help="USER/PASSWORD@HOST:PORT/DATABASE; defaults to MYSQL_CONNECTION",
    )
    parser.add_argument(
        "--dameng",
        default=os.environ.get("DAMENG_CONNECTION"),
        help="USER/PASSWORD@HOST:PORT; defaults to DAMENG_CONNECTION",
    )
    parser.add_argument("--batch-size", type=int, default=50, help="rows per committed batch (default: 50)")
    parser.add_argument(
        "--truncate-target",
        action="store_true",
        help="truncate the target table before importing; use for a clean restart only",
    )
    args = parser.parse_args()

    if not args.mysql or not args.dameng:
        parser.error("provide --mysql/--dameng or MYSQL_CONNECTION/DAMENG_CONNECTION")
    if args.batch_size <= 0:
        parser.error("--batch-size must be greater than zero")

    try:
        mysql = parse_connection(args.mysql, include_database=True)
        dameng = parse_connection(args.dameng, include_database=False)
        rows = migrate_table(args.table, mysql, dameng, args.batch_size, args.truncate_target)
    except Exception as error:
        print(f"Import failed: {error}", file=sys.stderr)
        return 1

    print(f"Imported {rows} row(s): {args.table} -> {target_table(args.table)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
