#!/usr/bin/env bash
# Import LOB tables from MySQL data dumps with dmPython rather than disql.
# Usage:
#   ./import_dm_lob_tables.sh TABLE_ORDER_FILE MYSQL_DUMP_DIRECTORY PYTHON_EXECUTABLE 'USER/PASSWORD@HOST:PORT'
#
# Example:
#   ./import_dm_lob_tables.sh dm_lob_import_order.txt ./mysql_data python3 'SYSDBA/Password@127.0.0.1:5236'

set -euo pipefail

ORDER_FILE=${1:?Usage: $0 TABLE_ORDER_FILE MYSQL_DUMP_DIRECTORY PYTHON_EXECUTABLE CONNECTION_STRING}
MYSQL_DUMP_DIRECTORY=${2:?Usage: $0 TABLE_ORDER_FILE MYSQL_DUMP_DIRECTORY PYTHON_EXECUTABLE CONNECTION_STRING}
PYTHON=${3:?Usage: $0 TABLE_ORDER_FILE MYSQL_DUMP_DIRECTORY PYTHON_EXECUTABLE CONNECTION_STRING}
CONNECTION=${4:?Usage: $0 TABLE_ORDER_FILE MYSQL_DUMP_DIRECTORY PYTHON_EXECUTABLE CONNECTION_STRING}
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
IMPORTER="$SCRIPT_DIR/import_avatar_uploaded.py"

[ -f "$ORDER_FILE" ] || { echo "Order file not found: $ORDER_FILE" >&2; exit 1; }
[ -d "$MYSQL_DUMP_DIRECTORY" ] || { echo "MySQL dump directory not found: $MYSQL_DUMP_DIRECTORY" >&2; exit 1; }
[ -x "$PYTHON" ] || command -v "$PYTHON" >/dev/null 2>&1 || { echo "Python executable not found: $PYTHON" >&2; exit 1; }

imported=0
skipped=0
while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    table=$(printf '%s' "$raw_line" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$table" ] && continue
    case "$table" in
        \#*) continue ;;
    esac

    normalized_table=$(printf '%s' "$table" | tr '[:lower:]' '[:upper:]')
    if [ "$normalized_table" != "AVATAR_UPLOADED" ]; then
        echo "[SKIP] $table: no dmPython importer is registered"
        skipped=$((skipped + 1))
        continue
    fi

    mysql_dump_file="$MYSQL_DUMP_DIRECTORY/${table}.sql"
    if [ ! -f "$mysql_dump_file" ]; then
        mysql_dump_file="$MYSQL_DUMP_DIRECTORY/${normalized_table}.sql"
    fi
    [ -f "$mysql_dump_file" ] || { echo "[FAILED] $table: MySQL dump file not found" >&2; exit 1; }

    log_file="$MYSQL_DUMP_DIRECTORY/${normalized_table}.dmpython.import.log"
    echo "[IMPORT] $table <- $mysql_dump_file"
    if "$PYTHON" "$IMPORTER" "$mysql_dump_file" "$CONNECTION" > "$log_file" 2>&1; then
        echo "[OK]     $table (log: $log_file)"
        imported=$((imported + 1))
    else
        echo "[FAILED] $table. Inspect: $log_file" >&2
        exit 1
    fi
done < "$ORDER_FILE"

echo "Completed. Imported: $imported; skipped (no registered importer): $skipped."
