# `avatar_uploaded` 无用数据清理操作文档

## 1. 目的

当配置以下参数时：

```python
AVATAR_FILE_STORAGE = 'seahub.base.database_storage.DatabaseStorage'
```

用户和群组头像的图片内容保存在 Seahub 数据库表 `avatar_uploaded` 中。

头像被更新或删除后，旧头像文件及缩略图可能仍残留在 `avatar_uploaded`，导致该表持续增长。本操作用于删除当前未被用户头像或群组头像引用的文件记录。

## 2. 清理范围

保留以下有效数据：

- `avatar_avatar.avatar` 所引用的用户头像原图
- 用户头像原图对应的所有缩略图，例如 `resized/256/`、`resized/80/`
- `avatar_groupavatar.avatar` 所引用的群组头像原图
- 群组头像原图对应的所有缩略图

删除以下数据：

- 未被 `avatar_avatar` 或 `avatar_groupavatar` 引用的旧头像原图
- 上述旧头像原图对应的全部缩略图
- 其他未被当前头像记录引用的 `avatar_uploaded` 数据

## 3. 执行前说明

- 适用于 MySQL / MariaDB。
- 建议在维护窗口或业务低峰期执行。
- 所有 SQL 必须在同一个 MySQL 连接会话中执行，因为使用了临时表。
- 测试环境可直接执行；生产环境应先在测试环境验证查询结果。
- 不建议按 `mtime` 时间字段直接删除，因为旧头像记录可能仍被保留和使用。
- 该清理只删除图片二进制数据表 `avatar_uploaded` 的孤儿数据，不会删除 `avatar_avatar`、`avatar_groupavatar` 的业务记录。

## 4. 登录数据库

```bash
mysql -u <mysql_user> -p <seahub_db>
```

进入后确认当前数据库：

```sql
SELECT DATABASE();
```

如有需要，手动切换：

```sql
USE <seahub_db>;
```

## 5. 创建当前有效头像原图清单

创建临时表，汇总当前用户头像和群组头像引用的原图路径。

```sql
CREATE TEMPORARY TABLE active_avatar_source (
    filename VARCHAR(1024) NOT NULL,
    PRIMARY KEY (filename)
) ENGINE=InnoDB;
```

写入当前用户头像原图：

```sql
INSERT IGNORE INTO active_avatar_source (filename)
SELECT avatar
FROM avatar_avatar
WHERE avatar <> '';
```

写入当前群组头像原图：

```sql
INSERT IGNORE INTO active_avatar_source (filename)
SELECT avatar
FROM avatar_groupavatar
WHERE avatar <> '';
```

查看当前有效头像原图数量：

```sql
SELECT COUNT(*) AS active_avatar_source_count
FROM active_avatar_source;
```

可抽样确认头像路径：

```sql
SELECT filename
FROM active_avatar_source
LIMIT 20;
```

预期路径示例：

```text
avatars/user@example.com/avatar.jpg
avatars/6/9/5011f01afac2a506b9544c5ce21a0a/avatar.jpg
avatars/groups/123/avatar.png
```

## 6. 创建有效文件清单

`avatar_uploaded` 里除了原图外，还会保存缩略图。因此需要标记当前所有有效的原图和缩略图。

```sql
CREATE TEMPORARY TABLE active_avatar_uploaded (
    filename_md5 CHAR(32) NOT NULL,
    PRIMARY KEY (filename_md5)
) ENGINE=InnoDB;
```

### 6.1 标记有效原图

`avatar_uploaded.filename_md5` 是 `MD5(filename)`，因此可以直接根据原图路径计算并写入，无需扫描整张表。

```sql
INSERT IGNORE INTO active_avatar_uploaded (filename_md5)
SELECT MD5(filename)
FROM active_avatar_source;
```

### 6.2 标记有效缩略图

缩略图路径规则如下：

```text
原图:
avatars/user@example.com/avatar.jpg

缩略图:
avatars/user@example.com/resized/256/avatar.png
avatars/user@example.com/resized/80/avatar.png
```

执行以下 SQL，保留当前头像的所有尺寸缩略图：

```sql
INSERT IGNORE INTO active_avatar_uploaded (filename_md5)
SELECT u.filename_md5
FROM avatar_uploaded AS u
INNER JOIN active_avatar_source AS a
    ON u.filename LIKE CONCAT(
        LEFT(
            a.filename,
            CHAR_LENGTH(a.filename) - CHAR_LENGTH(SUBSTRING_INDEX(a.filename, '/', -1))
        ),
        'resized/%/',
        LEFT(
            SUBSTRING_INDEX(a.filename, '/', -1),
            CHAR_LENGTH(SUBSTRING_INDEX(a.filename, '/', -1))
                - LOCATE('.', REVERSE(SUBSTRING_INDEX(a.filename, '/', -1)))
        ),
        '.%'
    );
```

查看有效文件数量：

```sql
SELECT COUNT(*) AS active_avatar_uploaded_count
FROM active_avatar_uploaded;
```

## 7. 删除前核查

### 7.1 统计待删除记录数和数据量

```sql
SELECT
    COUNT(*) AS orphaned_rows,
    SUM(u.size) AS original_bytes,
    ROUND(SUM(u.size) / 1024 / 1024, 2) AS original_mb,
    ROUND(SUM(u.size) / 1024 / 1024 / 1024, 2) AS original_gb
FROM avatar_uploaded AS u
LEFT JOIN active_avatar_uploaded AS a
    ON u.filename_md5 = a.filename_md5
WHERE a.filename_md5 IS NULL;
```

`original_bytes` / `original_mb` 是图片原始字节数之和。`avatar_uploaded.data` 存储的是 Base64 编码数据，实际表空间通常大于原始数据量。

### 7.2 抽样查看待删除数据

```sql
SELECT
    u.filename,
    u.size,
    u.mtime
FROM avatar_uploaded AS u
LEFT JOIN active_avatar_uploaded AS a
    ON u.filename_md5 = a.filename_md5
WHERE a.filename_md5 IS NULL
ORDER BY u.mtime DESC
LIMIT 100;
```

确认结果中的路径确实为历史头像或无效缩略图后，再执行删除。

### 7.3 检查当前原图均被保留

以下用户头像查询必须返回 `0` 行：

```sql
SELECT
    aa.id,
    aa.emailuser,
    aa.avatar
FROM avatar_avatar AS aa
LEFT JOIN active_avatar_uploaded AS au
    ON au.filename_md5 = MD5(aa.avatar)
WHERE aa.avatar <> ''
  AND au.filename_md5 IS NULL;
```

以下群组头像查询也必须返回 `0` 行：

```sql
SELECT
    ga.id,
    ga.group_id,
    ga.avatar
FROM avatar_groupavatar AS ga
LEFT JOIN active_avatar_uploaded AS au
    ON au.filename_md5 = MD5(ga.avatar)
WHERE ga.avatar <> ''
  AND au.filename_md5 IS NULL;
```

## 8. 分批删除孤儿数据

建议每批删除 `10000` 行，避免大事务、长时间锁等待和大量 undo log。

重复执行以下 SQL：

```sql
DELETE FROM avatar_uploaded
WHERE filename_md5 IN (
    SELECT filename_md5
    FROM (
        SELECT u.filename_md5
        FROM avatar_uploaded AS u
        LEFT JOIN active_avatar_uploaded AS a
            ON u.filename_md5 = a.filename_md5
        WHERE a.filename_md5 IS NULL
        LIMIT 10000
    ) AS orphan_batch
);
```

每次执行会返回类似：

```text
Query OK, 10000 rows affected
```

持续执行，直到返回：

```text
Query OK, 0 rows affected
```

也可在每批后检查剩余数量：

```sql
SELECT COUNT(*) AS remaining_orphaned_rows
FROM avatar_uploaded AS u
LEFT JOIN active_avatar_uploaded AS a
    ON u.filename_md5 = a.filename_md5
WHERE a.filename_md5 IS NULL;
```

当结果为 `0` 时，说明孤儿头像数据已清理完成。

## 9. 清理后验证

确认 `avatar_uploaded` 剩余记录均属于当前有效头像或其缩略图：

```sql
SELECT COUNT(*) AS remaining_orphaned_rows
FROM avatar_uploaded AS u
LEFT JOIN active_avatar_uploaded AS a
    ON u.filename_md5 = a.filename_md5
WHERE a.filename_md5 IS NULL;
```

预期结果：

```text
remaining_orphaned_rows = 0
```

随机检查现有用户头像、群组头像在 Web 页面和 API 中是否可正常显示。

## 10. 回收磁盘空间

删除数据后，InnoDB 通常不会立刻缩小物理表文件。若需要回收磁盘空间，可在维护窗口执行：

```sql
OPTIMIZE TABLE avatar_uploaded;
```

注意：

- `OPTIMIZE TABLE` 可能耗时较长。
- 大表执行时可能产生较高 IO，并可能造成锁等待或表重建影响。
- 应在低峰期执行，并确保数据库所在磁盘有足够可用空间。

## 11. 后续说明

本次操作仅清理现存孤儿数据。当前头像更新流程不会自动删除 `avatar_uploaded` 中旧头像及缩略图，因此后续仍可能继续产生孤儿数据。

建议后续评估以下长期方案：

1. 修改头像替换和删除逻辑，同步删除 storage 中的原图与缩略图。
2. 增加定期清理任务，例如按月执行本操作。
3. 在生产环境先通过只读统计和抽样核对，再执行正式删除。
