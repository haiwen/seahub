# AVATAR_UPLOADED dmPython 导入

## 1. 适用场景和工作流

`avatar_uploaded.data` 保存 Base64 编码的头像内容。单条记录可能超过达梦 `disql` 的 SQL 文本长度限制，因此不能使用转换后的达梦 SQL 文件和 `import_dm_tables.sh` 导入该表。

`import_avatar_uploaded.py` 使用 dmPython 参数绑定将完整 `DATA` 内容写入达梦 `CLOB` 字段。它读取的是 MySQL 原始数据 dump，而不是 `convert_mysql_to_dameng.py` 输出的达梦 SQL。

```text
普通表：
MySQL dump -> convert_mysql_to_dameng.py -> dameng_data/*.sql -> import_dm_tables.sh -> disql

AVATAR_UPLOADED：
MySQL dump -> import_avatar_uploaded.py -> dmPython 参数绑定 -> 达梦
```

## 2. 前提条件

1. 达梦目标库已执行 `dameng.sql`，并存在如下表：

```sql
CREATE TABLE IF NOT EXISTS "AVATAR_UPLOADED" (
    "FILENAME" TEXT NOT NULL,
    "FILENAME_MD5" CHAR(32) NOT NULL PRIMARY KEY,
    "DATA" CLOB NOT NULL,
    "SIZE" INTEGER NOT NULL,
    "MTIME" DATETIME NOT NULL
);
```

2. 迁移机已安装达梦 Python 驱动，以下命令可执行：

```bash
python3 -c 'import dmPython; print(dmPython.__file__)'
```

3. MySQL 数据必须以一条 INSERT 对应一条记录的方式导出，即必须使用 `--complete-insert` 与 `--skip-extended-insert`。

4. `AVATAR_UPLOADED` 不能使用 `import_dm_tables.sh` 导入，也不需要使用 `convert_mysql_to_dameng.py` 转换。

## 3. 导出 MySQL 原始数据

在 MySQL 迁移源端执行：

```bash
mkdir -p ./mysql_data

mysqldump -u <mysql_user> -p \
  --no-create-info \
  --skip-add-locks \
  --skip-comments \
  --complete-insert \
  --skip-extended-insert \
  --default-character-set=utf8mb4 \
  --single-transaction \
  <seahub_db> avatar_uploaded > ./mysql_data/avatar_uploaded.sql
```

该文件是 MySQL dump。文件扩展名虽然也是 `.sql`，但它不是达梦 SQL 文件，不能直接使用 `disql` 执行。每个头像记录必须是一条完整的 MySQL INSERT，示例如下：

```sql
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
INSERT INTO `avatar_uploaded` (`filename`, `filename_md5`, `data`, `size`, `mtime`) VALUES ('avatars/user@example.com/avatar.png', 'b0a7f4b4cccb8e492b3a725443bd4da4', 'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAABCmlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGAyYAACJgEGhty8kqIgdyeFiMgoBQYkkJhcXMCAGzAyMHy7BiIZGC7r4lGHC3CmpBYnA+kPQFxSBLQcaGQKkC2SDmFXgNhJEHYPiF0UEuQMZC8AsjXSkdhJSOzykoISIPsESH1yQRGIfQfIDsnNKU1GuJuBJzUvNBhIRwCxDEMxQxCDO4MTGX7ACxDhmb+IgcHiKwMD8wSEWNJMBobtrQwMErcQYipAP/C3MDBsO1+QWJQIFmIBYqa0NAaGT8sZGHgjGRiELzAwcEVj2oGICxx+tQD71Z0hHwjTGXIYUhkUGDwZ8hiSGfSALCMGAwZDBjNcfgEAsp9A2ZPrFzMAAQAASURBVHiczP35ryXZlt+HffYQ8xnumHNlVb16Yze72xToJmmQ8iCThm0YNuABsAH7B/1hhgEbAmhbhiCJkAFLpsgWx2a3enxTvawhKzPvfMaY9+QfdtybQ9WrV1VNSo7Crbz3nDgRcSL2Xnut7/qu7xL/2Z9vA99wE990x2kL4Rsf+jtt3+34ghC+7TeZPi', 12345, '2026-08-14 12:00:00');
INSERT INTO `avatar_uploaded` (`filename`, `filename_md5`, `data`, `size`, `mtime`) VALUES ('avatars/groups/123/group.png', '65a8e27d8879283831b664bd8b7f0ad4', 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAB...', 6789, '2026-08-14 12:01:00');
```

字段含义：

| 字段 | 示例 | 说明 |
| --- | --- | --- |
| `filename` | `avatars/user@example.com/avatar.png` | 头像文件的逻辑路径，对应 `avatar_avatar.avatar` 或 `avatar_groupavatar.avatar`。 |
| `filename_md5` | `b0a7f4b4cccb8e492b3a725443bd4da4` | `MD5(filename)`，也是 `avatar_uploaded` 的主键。 |
| `data` | `iVBORw0KGgo...` | 图片二进制内容的 Base64 编码。实际内容很长，PNG 常以 `iVBORw0KGgo` 开头。 |
| `size` | `12345` | 图片原始二进制大小，单位为字节，不是 Base64 字符串长度。 |
| `mtime` | `2026-08-14 12:00:00` | 文件写入时间。 |

导出文件必须满足以下要求：

1. 每条 `INSERT` 只包含一条头像记录，不能是 `VALUES (...), (...), (...)` 的扩展 INSERT。
2. `INSERT` 必须包含完整列名列表，即 `INSERT INTO ... (\`filename\`, \`filename_md5\`, \`data\`, \`size\`, \`mtime\`)`。
3. `data` 必须是单引号包裹的 Base64 字符串。
4. 文件中存在 `SET`、`LOCK TABLES` 等 mysqldump 控制语句是允许的，导入器会跳过它们。

不要将此文件交给 `disql` 执行，不要使用 `convert_mysql_to_dameng.py` 转换它，也不要将其视为达梦 SQL 文件。

## 4. 导入单个文件

进入 `dameng_migrate` 目录后执行：

```bash
python3 ./import_avatar_uploaded.py \
  ./mysql_data/avatar_uploaded.sql \
  'SYSDBA/Password@127.0.0.1:5236'
```

参数说明：

| 参数 | 说明 |
| --- | --- |
| 第一个参数 | MySQL 原始 dump 文件路径，例如 `./mysql_data/avatar_uploaded.sql`。 |
| 第二个参数 | 达梦连接字符串，格式为 `USER/PASSWORD@HOST:PORT`。 |
| `--batch-size` | 每批提交的记录数，默认 `100`。 |

数据量较大或需要缩短事务时间时，可降低提交批次：

```bash
python3 ./import_avatar_uploaded.py \
  ./mysql_data/avatar_uploaded.sql \
  'SYSDBA/Password@127.0.0.1:5236' \
  --batch-size 50
```

导入器会在每个批次成功后提交事务。某一批失败时，当前未提交批次会回滚，已经提交的批次保留；修复问题后需要清空目标表或从失败位置重新处理，避免主键重复。

连接字符串格式与 `import_dm_tables.sh` 相同：

```text
USER/PASSWORD@HOST:PORT
```

密码中如包含 `/` 或 `@`，该格式无法可靠解析。请使用不含这些字符的迁移专用数据库账号，或修改 `import_avatar_uploaded.py` 中的连接参数解析方式。

## 5. 按清单批量导入

批量脚本 `import_dm_lob_tables.sh` 的参数形式与 `import_dm_tables.sh` 类似：

```text
./import_dm_lob_tables.sh TABLE_ORDER_FILE MYSQL_DUMP_DIRECTORY PYTHON_EXECUTABLE CONNECTION_STRING
```

参数说明：

| 参数 | 说明 |
| --- | --- |
| `TABLE_ORDER_FILE` | LOB 表清单，默认使用 `dm_lob_import_order.txt`。 |
| `MYSQL_DUMP_DIRECTORY` | 保存 MySQL 原始 dump 的目录，不是达梦转换 SQL 目录。 |
| `PYTHON_EXECUTABLE` | 可导入 `dmPython` 的 Python，例如 `python3` 或虚拟环境中的 Python 路径。 |
| `CONNECTION_STRING` | 达梦连接字符串，格式为 `USER/PASSWORD@HOST:PORT`。 |

执行示例：

```bash
./import_dm_lob_tables.sh \
  ./dm_lob_import_order.txt \
  ./mysql_data \
  python3 \
  'SYSDBA/Password@127.0.0.1:5236'
```

默认清单 `dm_lob_import_order.txt` 只包含：

```text
AVATAR_UPLOADED
```

脚本在 `MYSQL_DUMP_DIRECTORY` 中按以下顺序查找 MySQL dump 文件：

```text
<MYSQL_DUMP_DIRECTORY>/AVATAR_UPLOADED.sql
<MYSQL_DUMP_DIRECTORY>/avatar_uploaded.sql
```

导入日志写入：

```text
<MYSQL_DUMP_DIRECTORY>/AVATAR_UPLOADED.dmpython.import.log
```

## 6. 与普通表导入的执行顺序

建议按以下顺序执行：

1. 执行 `dameng.sql` 创建达梦空表。
2. 使用 `mysqldump.sh` 或等效命令导出 MySQL 数据至 `mysql_data/`。
3. 执行 `convert_all.sh` 转换普通表。脚本已跳过 `avatar_uploaded`。
4. 使用 `import_dm_tables.sh` 将 `dameng_data/` 中的普通表 SQL 导入达梦。
5. 使用本文件第 5 节的 `import_dm_lob_tables.sh`，从 `mysql_data/avatar_uploaded.sql` 直接导入头像数据。
6. 对比源端与目标端行数，并抽样验证头像是否能正常读取。

普通表导入示例：

```bash
./import_dm_tables.sh \
  ./dm_import_order.txt \
  ./dameng_data \
  /dm8/bin/disql \
  'SYSDBA/Password@127.0.0.1:5236'
```

## 7. 导入后校验

达梦中检查记录数：

```sql
SELECT COUNT(*) FROM "AVATAR_UPLOADED";
```

检查 `DATA` 是否写入：

```sql
SELECT "FILENAME", "SIZE", LENGTH("DATA") AS "DATA_LENGTH"
FROM "AVATAR_UPLOADED"
FETCH FIRST 10 ROWS ONLY;
```

`DATA_LENGTH` 应大于 `0`。随后启动 Seahub 并随机访问已有用户头像，确认应用可以从 `AVATAR_UPLOADED` 中读取并解码图片。
