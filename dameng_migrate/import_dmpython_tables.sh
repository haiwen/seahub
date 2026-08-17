#!/usr/bin/env bash
# Import MySQL tables into Dameng through dmPython in the supplied dependency order.
# Usage:
#   ./import_dmpython_tables.sh TABLE_ORDER_FILE PYTHON_EXECUTABLE MYSQL_CONNECTION DAMENG_CONNECTION
#
# Example:
#   ./import_dmpython_tables.sh dm_import_order.txt python3 \
#     'root/password@127.0.0.1:3306/seahub_db' 'SYSDBA/password@127.0.0.1:5236'

set -euo pipefail

ORDER_FILE=${1:?Usage: $0 TABLE_ORDER_FILE PYTHON_EXECUTABLE MYSQL_CONNECTION DAMENG_CONNECTION}
PYTHON=${2:?Usage: $0 TABLE_ORDER_FILE PYTHON_EXECUTABLE MYSQL_CONNECTION DAMENG_CONNECTION}
MYSQL_CONNECTION=${3:?Usage: $0 TABLE_ORDER_FILE PYTHON_EXECUTABLE MYSQL_CONNECTION DAMENG_CONNECTION}
DAMENG_CONNECTION=${4:?Usage: $0 TABLE_ORDER_FILE PYTHON_EXECUTABLE MYSQL_CONNECTION DAMENG_CONNECTION}
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
IMPORTER="$SCRIPT_DIR/dmpython_import.py"

[ -f "$ORDER_FILE" ] || { echo "Order file not found: $ORDER_FILE" >&2; exit 1; }
[ -x "$PYTHON" ] || command -v "$PYTHON" >/dev/null 2>&1 || { echo "Python executable not found: $PYTHON" >&2; exit 1; }

imported=0
while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    table=$(printf '%s' "$raw_line" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$table" ] && continue
    case "$table" in
        \#*) continue ;;
    esac

    echo "[IMPORT] $table"
    if "$PYTHON" "$IMPORTER" "$table" --mysql "$MYSQL_CONNECTION" --dameng "$DAMENG_CONNECTION"; then
        echo "[OK]     $table"
        imported=$((imported + 1))
    else
        echo "[FAILED] $table" >&2
        exit 1
    fi
done < "$ORDER_FILE"

echo "Completed. Imported: $imported table(s)."
