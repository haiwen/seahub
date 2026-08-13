#!/usr/bin/env bash
# Count exact rows in Dameng tables listed in a text file.
# Usage:
#   ./count_dm_tables.sh dm_import_order.txt /dm8/bin/disql 'USER/PASSWORD@HOST:PORT' dm_counts.tsv

set -euo pipefail

ORDER_FILE=${1:?Usage: $0 ORDER_FILE DISQL_PATH CONNECTION_STRING OUTPUT_FILE}
DISQL=${2:?Usage: $0 ORDER_FILE DISQL_PATH CONNECTION_STRING OUTPUT_FILE}
CONNECTION=${3:?Usage: $0 ORDER_FILE DISQL_PATH CONNECTION_STRING OUTPUT_FILE}
OUTPUT_FILE=${4:?Usage: $0 ORDER_FILE DISQL_PATH CONNECTION_STRING OUTPUT_FILE}

[ -f "$ORDER_FILE" ] || { echo "Order file not found: $ORDER_FILE" >&2; exit 1; }
[ -x "$DISQL" ] || { echo "disql is not executable: $DISQL" >&2; exit 1; }

printf 'TABLE\tROWS\tSTATUS\n' > "$OUTPUT_FILE"
declare -A seen_tables=()

while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    table=$(printf '%s' "$raw_line" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$table" ] && continue
    case "$table" in \#*) continue ;; esac

    if [[ -n ${seen_tables[$table]:-} ]]; then
        continue
    fi
    seen_tables[$table]=1

    # The supplied Dameng DDL creates quoted uppercase identifiers.
    # Print a unique marker to reliably extract the count from disql output.
    result=$(printf 'SELECT COUNT(*) FROM "%s";\n' "$table" | "$DISQL" "$CONNECTION" 2>&1) || {
        printf '%s\t\tERROR\n' "$table" | tee -a "$OUTPUT_FILE"
        printf '%s\n' "$result" >&2
        continue
    }

    count=$(printf '%s\n' "$result" | awk '
        /^[[:space:]]*[0-9]+[[:space:]]*$/ { value=$1 }
        END { if (value != "") print value }
    ')

    if [ -z "$count" ]; then
        printf '%s\t\tERROR\n' "$table" | tee -a "$OUTPUT_FILE"
        printf '%s\n' "$result" >&2
    else
        printf '%s\t%s\tOK\n' "$table" "$count" | tee -a "$OUTPUT_FILE"
    fi
done < "$ORDER_FILE"

echo "Saved exact Dameng row counts to: $OUTPUT_FILE"
