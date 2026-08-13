#!/usr/bin/env bash
# Execute one converted SQL file with Dameng disql.
# Usage:
#   bash ./import_dm_sql_file.sh /data/dm_data/AUTH_USER.sql /dm8/bin/disql 'USER/PASSWORD@HOST:PORT'

set -euo pipefail

SQL_FILE=${1:?Usage: $0 SQL_FILE DISQL_PATH CONNECTION_STRING}
DISQL=${2:?Usage: $0 SQL_FILE DISQL_PATH CONNECTION_STRING}
CONNECTION=${3:?Usage: $0 SQL_FILE DISQL_PATH CONNECTION_STRING}

[ -f "$SQL_FILE" ] || { echo "SQL file not found: $SQL_FILE" >&2; exit 1; }
[ -r "$SQL_FILE" ] || { echo "SQL file is not readable: $SQL_FILE" >&2; exit 1; }
[ -x "$DISQL" ] || { echo "disql is not executable: $DISQL" >&2; exit 1; }

LOG_FILE="${SQL_FILE}.import.log"

echo "[IMPORT] $SQL_FILE"
if "$DISQL" "$CONNECTION" < "$SQL_FILE" > "$LOG_FILE" 2>&1; then
    echo "[OK]     $SQL_FILE (log: $LOG_FILE)"
else
    echo "[FAILED] $SQL_FILE. Inspect: $LOG_FILE" >&2
    exit 1
fi
