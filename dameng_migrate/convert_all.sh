#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="./mysql_data"
TARGET_DIR="./dameng_data"
CONVERTER="./convert_mysql_to_dameng.py"

mkdir -p "$TARGET_DIR"

for source_file in "$SOURCE_DIR"/*.sql; do
  [ -e "$source_file" ] || continue

  table_name="$(basename "$source_file" .sql)"
  if [ "$(printf '%s' "$table_name" | tr '[:lower:]' '[:upper:]')" = "AVATAR_UPLOADED" ]; then
    echo "跳过：$source_file 由 import_avatar_uploaded.py 直接导入达梦"
    continue
  fi
  target_table="$(printf '%s' "$table_name" | tr '[:lower:]' '[:upper:]')"
  target_file="$TARGET_DIR/${target_table}.sql"
  #target_file="$TARGET_DIR/${table_name^^}.sql"

  echo "转换：$source_file -> $target_file"
  python3 "$CONVERTER" "$source_file" "$target_file"
done
