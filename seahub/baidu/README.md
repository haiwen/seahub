# 百度网盘集成模块

本模块实现了 Seafile 与百度网盘之间的文件互操作功能，使用 JWT token 进行跨服务认证。

## 功能特性

- **JWT Token 认证**: 安全的跨服务文件访问认证
- **文件操作支持**: 支持同步、上传、下载等操作
- **权限控制**: 继承 Seafile 的权限系统
- **灵活配置**: 通过配置开关控制功能启用

## 配置启用

在 `seahub_settings.py` 中添加：

```python
# 启用百度网盘集成功能
ENABLE_BAIDU_NETDISK = True
```

## API 接口

### 1. 获取访问 Token

**请求**:
```
GET /api/v2.1/baidu/access-token/{repo_id}/?p={file_path}&operation={operation}
```

**参数**:
- `repo_id`: 仓库 ID
- `p`: 文件路径
- `operation`: 操作类型 (sync/upload/download)

**响应**:
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "file_uuid": "12345678-1234-1234-1234-123456789abc",
    "operation": "sync"
}
```

### 2. 获取文件信息

**请求**:
```
GET /api/v2.1/baidu/file-info/{file_uuid}/
Authorization: Bearer {access_token}
```

**响应**:
```json
{
    "file_uuid": "12345678-1234-1234-1234-123456789abc",
    "filename": "example.txt",
    "file_path": "/path/to/file.txt",
    "repo_id": "repo-uuid",
    "file_type": "Text",
    "file_ext": "txt",
    "size": 1024,
    "mtime": 1640995200,
    "operation": "sync",
    "username": "user@example.com"
}
```

### 3. 验证 Token

**请求**:
```
POST /api/v2.1/baidu/validate-token/
Content-Type: application/json

{
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "file_uuid": "12345678-1234-1234-1234-123456789abc"
}
```

**响应**:
```json
{
    "is_valid": true,
    "payload": {
        "file_uuid": "12345678-1234-1234-1234-123456789abc",
        "filename": "example.txt",
        "username": "user@example.com",
        "operation": "sync",
        "service": "baidu_netdisk",
        "exp": 1641081600
    }
}
```

## 使用流程

### 场景1: 上传 Seafile 文件到百度网盘

1. 前端调用 `/api/v2.1/baidu/access-token/` 获取 JWT token
2. 百度网盘服务使用 token 调用 `/api/v2.1/baidu/file-info/` 获取文件信息
3. 百度网盘服务下载文件内容并上传到百度网盘

### 场景2: 从百度网盘下载文件到 Seafile

1. 前端调用 `/api/v2.1/baidu/access-token/` 获取 JWT token (operation=upload)
2. 百度网盘服务使用 token 验证权限
3. 百度网盘服务下载文件并上传到指定的 Seafile 仓库

## 安全特性

- **Token 过期**: JWT token 默认3天过期
- **服务标识**: Token 包含 `service: "baidu_netdisk"` 标识
- **权限继承**: 基于 Seafile 的文件权限系统
- **文件绑定**: Token 与特定文件 UUID 绑定

## 扩展开发

可以基于此模块扩展更多功能：

- 文件同步状态管理
- 批量文件处理
- 同步历史记录
- 冲突解决机制

## 注意事项

1. 确保 `PyJWT` 库已安装
2. 在生产环境中使用独立的签名密钥
3. 根据需要调整 token 过期时间
4. 实现适当的错误处理和日志记录 