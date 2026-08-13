#!/usr/bin/env bash
set -euo pipefail

MYSQL_HOST="127.0.0.1"
MYSQL_PORT="3306"
MYSQL_USER="root"
MYSQL_DB="seahub"
OUTPUT_DIR="./mysql_data"

mkdir -p "$OUTPUT_DIR"

# 建议运行前执行：read -rsp "MySQL 密码: " MYSQL_PASS; echo
# 不建议把密码直接写进脚本。
read -rsp "MySQL 密码: " MYSQL_PASS
echo

TABLES=$(mysql \
  -h "$MYSQL_HOST" \
  -P "$MYSQL_PORT" \
  -u "$MYSQL_USER" \
  -p"$MYSQL_PASS" \
  -N \
  -e "SHOW TABLES FROM \`$MYSQL_DB\`;")

while IFS= read -r TABLE; do
  [ -z "$TABLE" ] && continue

  echo "导出表: $TABLE"

  mysqldump \
    -h "$MYSQL_HOST" \
    -P "$MYSQL_PORT" \
    -u "$MYSQL_USER" \
    -p"$MYSQL_PASS" \
    --no-create-info \
    --skip-add-locks \
    --skip-comments \
    --complete-insert \
    --skip-extended-insert \
    --default-character-set=utf8mb4 \
    --single-transaction \
    "$MYSQL_DB" "$TABLE" > "$OUTPUT_DIR/${TABLE}.sql"
done <<< "$TABLES"

unset MYSQL_PASS
echo "导出完成，文件在 $OUTPUT_DIR 目录"