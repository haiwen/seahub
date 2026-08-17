# dmPython 通用表导入

## 用途

`dmpython_import.py` 直接从 MySQL 读取一张表，通过 dmPython 参数绑定写入达梦。所有字段均作为绑定参数传递，因此适合普通表以及包含大 `TEXT` / `CLOB` 字段的表，例如 `AVATAR_UPLOADED.DATA`，不会触发 `disql` 的 SQL 文本长度限制。

该流程不使用 MySQL dump 文件，也不使用 `convert_mysql_to_dameng.py` 生成达梦 SQL：

```text
MySQL -> dmpython_import.py -> dmPython 参数绑定 -> 达梦
```

## 前提条件

1. 达梦目标库已执行对应 DDL，例如 `dameng.sql`。
2. 迁移机安装了 `pymysql` 与达梦官方 `dmPython` 驱动：

```bash
python3 -c 'import pymysql, dmPython; print("drivers available")'
```

3. MySQL 和达梦的表结构版本必须匹配。
4. 全库迁移时，源端应停写或只读，以保证数据一致性。

## 单表导入

```bash
python3 ./dmpython_import.py AVATAR_UPLOADED \
  --mysql 'root/Password@127.0.0.1:3306/seahub_db' \
  --dameng 'SYSDBA/Password@127.0.0.1:5236'
```

参数说明：

| 参数 | 说明 |
| --- | --- |
| `table` | MySQL 源表名，例如 `AVATAR_UPLOADED`、`FILEHISTORY`。 |
| `--mysql` | MySQL 连接，格式为 `USER/PASSWORD@HOST:PORT/DATABASE`。 |
| `--dameng` | 达梦连接，格式为 `USER/PASSWORD@HOST:PORT`。 |
| `--batch-size` | 每批提交记录数，默认 `50`。大 CLOB 表建议设置为 `10` 至 `50`。 |
| `--truncate-target` | 导入前清空达梦目标表。只用于确认需要从头重跑时。 |

普通表导入示例：

```bash
python3 ./dmpython_import.py FILEHISTORY \
  --mysql 'root/Password@127.0.0.1:3306/seahub_db' \
  --dameng 'SYSDBA/Password@127.0.0.1:5236' \
  --batch-size 500
```

若命令中不希望暴露连接串，可以使用环境变量：

```bash
export MYSQL_CONNECTION='root/Password@127.0.0.1:3306/seahub_db'
export DAMENG_CONNECTION='SYSDBA/Password@127.0.0.1:5236'
python3 ./dmpython_import.py AVATAR_UPLOADED --batch-size 20
```

连接密码不可包含 `/` 或 `@`。如包含这些字符，请使用迁移专用账号，或修改脚本的连接参数解析逻辑。

## 批量导入

使用 `dm_import_order.txt` 保证外键依赖顺序：

```bash
./import_dmpython_tables.sh \
  ./dm_import_order.txt \
  python3 \
  'root/Password@127.0.0.1:3306/seahub_db' \
  'SYSDBA/Password@127.0.0.1:5236'
```

参数格式：

```text
./import_dmpython_tables.sh TABLE_ORDER_FILE PYTHON_EXECUTABLE MYSQL_CONNECTION DAMENG_CONNECTION
```

批量脚本遇到失败会停止。此前已成功提交的表或批次不会回滚。修复问题后，从失败表继续；如需重跑某表，先确认允许清空该表，再执行：

```bash
python3 ./dmpython_import.py <TABLE> \
  --mysql '<MYSQL_CONNECTION>' \
  --dameng '<DAMENG_CONNECTION>' \
  --truncate-target
```

## 转换规则

导入器复用 `convert_mysql_to_dameng.py` 中的名称映射：

- 表名：`GROUP` 转为 `Group`。
- 列名：例如 `FILETRASH.user -> USERNAME`、`FILETRASH.size -> FILE_SIZE`。
- 达梦中带双引号的小写物理列会保留映射指定的大小写，例如 `FILEHISTORY.size`、`FILEAUDIT.user`。

由于不再拼接 SQL 字面量，JSON/TEXT/CLOB 字段无需执行原 SQL 转换器中的反斜杠转义转换，参数绑定会将原始 Python 字符串直接传递给驱动。

## 注意事项

1. 目标表必须已经创建。脚本只迁移数据，不创建 DDL。
2. `AVATAR_UPLOADED` 使用 CLOB 参数绑定，不需要转换为分块 `TO_CLOB()` SQL。
3. 迁移脚本显式写入源端 ID。所有带 `AUTO_INCREMENT` 的目标表在迁移完成后，应按达梦版本规范校准自增/序列起始值，避免应用后续创建数据发生主键冲突。
4. MySQL 零日期、二进制/BLOB 和不兼容的自定义类型应先在测试环境验证。Seahub 常规文本、CLOB、数值和普通时间类型可以直接参数绑定。
5. 对大 CLOB 表降低 `--batch-size`，避免驱动一次缓存过多数据。

## 验证

导入后比对源端与达梦行数：

```sql
SELECT COUNT(*) FROM "AVATAR_UPLOADED";
```

检查大字段已写入：

```sql
SELECT "FILENAME", "SIZE", LENGTH("DATA") AS "DATA_LENGTH"
FROM "AVATAR_UPLOADED"
FETCH FIRST 10 ROWS ONLY;
```

最后启动 Seahub，抽样验证用户头像和正常业务数据。
