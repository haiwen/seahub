#!/usr/bin/env bash
# Import converted per-table SQL files into Dameng in the order listed in a text file.
# Usage:
#   ./import_dm_tables.sh dm_import_order.txt /data/dm_data /dm8/bin/disql 'USER/PASSWORD@HOST:PORT'
#
# Example:
#   ./import_dm_tables.sh dm_import_order.txt ./dm_data /dm8/bin/disql 'SYSDBA/Password@127.0.0.1:5236'

set -euo pipefail

ORDER_FILE=${1:?Usage: $0 ORDER_FILE SQL_DIRECTORY DISQL_PATH CONNECTION_STRING}
SQL_DIRECTORY=${2:?Usage: $0 ORDER_FILE SQL_DIRECTORY DISQL_PATH CONNECTION_STRING}
DISQL=${3:?Usage: $0 ORDER_FILE SQL_DIRECTORY DISQL_PATH CONNECTION_STRING}
CONNECTION=${4:?Usage: $0 ORDER_FILE SQL_DIRECTORY DISQL_PATH CONNECTION_STRING}

[ -f "$ORDER_FILE" ] || { echo "Order file not found: $ORDER_FILE" >&2; exit 1; }
[ -d "$SQL_DIRECTORY" ] || { echo "SQL directory not found: $SQL_DIRECTORY" >&2; exit 1; }
[ -x "$DISQL" ] || { echo "disql is not executable: $DISQL" >&2; exit 1; }

find_sql_file() {
    local table=$1
    local expected="$SQL_DIRECTORY/$table.sql"
    local candidate

    if [ -f "$expected" ]; then
        printf '%s\n' "$expected"
        return 0
    fi

    # The converter normally produces uppercase names, but accept older lowercase files.
    candidate=$(find "$SQL_DIRECTORY" -maxdepth 1 -type f -iname "$table.sql" -print -quit)
    if [ -n "$candidate" ]; then
        printf '%s\n' "$candidate"
        return 0
    fi

    return 1
}

imported=0
skipped=0
while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    table=$(printf '%s' "$raw_line" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    [ -z "$table" ] && continue
    case "$table" in
        \#*) continue ;;
    esac

    if ! sql_file=$(find_sql_file "$table"); then
        echo "[SKIP] $table: no file named $table.sql in $SQL_DIRECTORY"
        skipped=$((skipped + 1))
        continue
    fi

    log_file="$SQL_DIRECTORY/${table}.import.log"
    echo "[IMPORT] $table <- $sql_file"

    if "$DISQL" "$CONNECTION" < "$sql_file" > "$log_file" 2>&1; then
        echo "[OK]     $table (log: $log_file)"
        imported=$((imported + 1))
    else
        echo "[FAILED] $table. Inspect: $log_file" >&2
        exit 1
    fi
done < "$ORDER_FILE"

echo "Completed. Imported: $imported; skipped (no SQL file): $skipped."
