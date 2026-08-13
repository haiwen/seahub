#!/usr/bin/env bash
# Count exact rows for every base table in the specified MySQL database.
# Usage:
#   ./count_mysql_tables.sh MYSQL_DATABASE OUTPUT_FILE
# MySQL connection parameters are read from environment variables:
#   MYSQL_HOST, MYSQL_PORT, MYSQL_USER
# The mysql client prompts for the password; do not place it on the command line.

set -euo pipefail

MYSQL_DATABASE=${1:?Usage: $0 MYSQL_DATABASE OUTPUT_FILE}
OUTPUT_FILE=${2:?Usage: $0 MYSQL_DATABASE OUTPUT_FILE}
MYSQL_HOST=${MYSQL_HOST:-127.0.0.1}
MYSQL_PORT=${MYSQL_PORT:-3306}
MYSQL_USER=${MYSQL_USER:-root}

command -v mysql >/dev/null || { echo 'mysql client was not found in PATH.' >&2; exit 1; }

read -rsp "MySQL password for ${MYSQL_USER}@${MYSQL_HOST}: " MYSQL_PASSWORD
echo

mysql_query() {
    mysql \
        --host="$MYSQL_HOST" \
        --port="$MYSQL_PORT" \
        --user="$MYSQL_USER" \
        --password="$MYSQL_PASSWORD" \
        --database="$MYSQL_DATABASE" \
        --batch \
        --skip-column-names \
        --default-character-set=utf8mb4 \
        --execute="$1"
}

# Directly query the selected database; no table-list file is used.
tables=$(mysql_query "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;")
printf 'TABLE\tROWS\tSTATUS\n' > "$OUTPUT_FILE"

while IFS= read -r table || [ -n "$table" ]; do
    [ -z "$table" ] && continue

    # Escape a backtick in the unlikely event it appears in a MySQL table name.
    quoted_table=${table//\`/\`\`}
    if count=$(mysql_query "SELECT COUNT(*) FROM \`$quoted_table\`;"); then
        printf '%s\t%s\tOK\n' "$table" "$count" | tee -a "$OUTPUT_FILE"
    else
        printf '%s\t\tERROR\n' "$table" | tee -a "$OUTPUT_FILE"
    fi
done <<< "$tables"

unset MYSQL_PASSWORD
echo "Saved exact MySQL row counts for database '$MYSQL_DATABASE' to: $OUTPUT_FILE"
