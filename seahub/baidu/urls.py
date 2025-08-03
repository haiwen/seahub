from django.urls import re_path
from .apis import BaiduAccessToken, BaiduFileInfo, BaiduValidateToken
from .auth_views import BaiduNetdiskAuthView, BaiduTokenRefreshView
from .network_libs_api import NetworkLibrariesView, BaiduNetdiskFilesView

# api/v2.1/baidu/
urlpatterns = [
    # 百度网盘授权相关
    re_path(
        r"^netdisk/auth/$",
        BaiduNetdiskAuthView.as_view(),
        name="baidu_netdisk_auth",
    ),
    re_path(
        r"^netdisk/refresh/$",
        BaiduTokenRefreshView.as_view(),
        name="baidu_netdisk_refresh",
    ),
    # 获取百度网盘访问token
    re_path(
        r"^access-token/(?P<repo_id>[-0-9a-f]{36})/$",
        BaiduAccessToken.as_view(),
        name="baidu_access_token",
    ),
    # 获取文件信息（需要JWT token验证）
    re_path(
        r"^file-info/(?P<file_uuid>[-0-9a-f]{36})/$",
        BaiduFileInfo.as_view(),
        name="baidu_file_info",
    ),
    # 验证token有效性
    re_path(
        r"^validate-token/$", BaiduValidateToken.as_view(), name="baidu_validate_token"
    ),
    # 百度网盘文件列表
    re_path(
        r"^netdisk/files/$",
        BaiduNetdiskFilesView.as_view(),
        name="baidu_netdisk_files",
    ),
]
