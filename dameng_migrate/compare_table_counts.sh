#!/usr/bin/env bash
# Compare TSV files produced by count_mysql_tables.sh and count_dm_tables.sh.
# Usage:
#   ./compare_table_counts.sh mysql_counts.tsv dm_counts.tsv count_comparison.tsv

set -euo pipefail

MYSQL_COUNTS=${1:?Usage: $0 MYSQL_COUNTS_TSV DAMENG_COUNTS_TSV OUTPUT_TSV}
DAMENG_COUNTS=${2:?Usage: $0 MYSQL_COUNTS_TSV DAMENG_COUNTS_TSV OUTPUT_TSV}
OUTPUT_FILE=${3:?Usage: $0 MYSQL_COUNTS_TSV DAMENG_COUNTS_TSV OUTPUT_TSV}

[ -f "$MYSQL_COUNTS" ] || { echo "File not found: $MYSQL_COUNTS" >&2; exit 1; }
[ -f "$DAMENG_COUNTS" ] || { echo "File not found: $DAMENG_COUNTS" >&2; exit 1; }

awk -F '\t' '
    NR == FNR {
        if (FNR > 1) {
            mysql_rows[toupper($1)] = $2
            mysql_status[toupper($1)] = $3
        }
        next
    }
    FNR == 1 { next }
    {
        table = toupper($1)
        dameng_rows[table] = $2
        dameng_status[table] = $3
        all_tables[table] = 1
    }
    END {
        for (table in mysql_rows) all_tables[table] = 1
        for (table in all_tables) {
            if (mysql_status[table] != "OK") result = "MYSQL_" mysql_status[table]
            else if (dameng_status[table] != "OK") result = "DAMENG_" dameng_status[table]
            else if (mysql_rows[table] == dameng_rows[table]) result = "MATCH"
            else result = "MISMATCH"
            print table "\t" mysql_rows[table] "\t" dameng_rows[table] "\t" result
        }
    }
' "$MYSQL_COUNTS" "$DAMENG_COUNTS" | sort -t $'\t' -k1,1 > "${OUTPUT_FILE}.body"

{
    printf 'TABLE\tMYSQL_ROWS\tDAMENG_ROWS\tRESULT\n'
    cat "${OUTPUT_FILE}.body"
} > "$OUTPUT_FILE"
rm -f "${OUTPUT_FILE}.body"

cat "$OUTPUT_FILE"
