# -*- coding: utf-8 -*-
import logging
import requests
from datetime import datetime
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

import sys
import os

# 参考百度网盘SDK示例的路径处理方式
# 将包含openapi_client的目录（即baidu目录）添加到sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # 这是baidu目录
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# 现在可以正常导入SDK
from openapi_client.api.userinfo_api import UserinfoApi
from openapi_client.api.fileinfo_api import FileinfoApi
from openapi_client.api_client import ApiClient
from openapi_client.configuration import Configuration
import openapi_client

logger = logging.getLogger(__name__)


class NetworkLibrariesView(APIView):
    """获取已连接的网络库列表"""

    authentication_classes = (SessionAuthentication, TokenAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _get_token_from_ndproxy(self, user_id):
        """从NDPROXY获取用户的百度网盘token信息"""
        ndproxy_url = getattr(settings, "NDPROXY_URL", "")
        if not ndproxy_url:
            logger.warning("NDPROXY_URL未配置")
            return None

        api_url = f"{ndproxy_url.rstrip('/')}/api/v1/auth/baidu/token"
        ssl_verify = getattr(settings, "NDPROXY_SSL_VERIFY", True)

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Seahub-BaiduNetdisk/1.0",
        }

        try:
            logger.info(f"正在从NDPROXY获取token信息: {api_url}")
            response = requests.get(
                api_url,
                params={"seafile_user": user_id},
                headers=headers,
                timeout=30,
                verify=ssl_verify,
            )

            if response.status_code == 200:
                response_data = response.json()
                # 检查响应中的code字段
                if response_data.get("code") == 200:
                    token_data = response_data.get("data", {})
                    logger.info(f"成功获取token信息，用户: {user_id}")
                    return token_data
                else:
                    logger.error(
                        f"NDPROXY返回业务错误: code={response_data.get('code')}, "
                        f"message={response_data.get('message')}"
                    )
                    return None
            else:
                logger.error(
                    f"NDPROXY返回错误状态: {response.status_code}, 响应: {response.text}"
                )
                return None

        except requests.RequestException as e:
            logger.error(f"从NDPROXY获取token时网络错误: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"从NDPROXY获取token时发生错误: {str(e)}")
            return None

    def _get_baidu_user_info(self, access_token):
        """使用百度SDK获取用户信息"""
        try:
            config = Configuration()
            api_client = ApiClient(configuration=config)
            userinfo_api = UserinfoApi(api_client)

            # 获取用户信息
            user_info_response = userinfo_api.xpannasuinfo(access_token=access_token)
            return user_info_response

        except Exception as e:
            logger.error(f"获取百度用户信息失败: {str(e)}")
            return None

    def _get_baidu_quota_info(self, access_token):
        """使用百度SDK获取配额信息"""
        try:
            config = Configuration()
            api_client = ApiClient(configuration=config)
            userinfo_api = UserinfoApi(api_client)

            # 获取配额信息
            quota_response = userinfo_api.apiquota(access_token=access_token)
            return quota_response

        except Exception as e:
            logger.error(f"获取百度配额信息失败: {str(e)}")
            return None

    def _format_size(self, size_bytes):
        """格式化存储大小"""
        if size_bytes is None:
            return "未知"

        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"

    def get(self, request):
        """获取当前用户已连接的网络库列表"""
        try:
            # 检查是否启用了百度网盘功能
            enable_baidu = getattr(settings, "ENABLE_BAIDU_NETDISK", False)

            network_libs = []

            if enable_baidu:
                user_id = request.user.username

                # 从NDPROXY获取token信息
                token_data = self._get_token_from_ndproxy(user_id)

                if token_data and token_data.get("is_active", False):
                    access_token = token_data.get("access_token")
                    expires_at = token_data.get("expires_at")

                    if access_token:
                        # 获取百度用户信息
                        user_info = self._get_baidu_user_info(access_token)
                        quota_info = self._get_baidu_quota_info(access_token)

                        # 构建网络库信息
                        baidu_lib = {
                            "id": "baidu_netdisk",
                            "name": "百度网盘",
                            "type": "baidu_netdisk",
                            "icon_type": "image",
                            "icon": "/media/img/baidu-netdisk-icon.svg",
                            "status": "connected",
                            "description": "已连接的百度网盘",
                        }

                        # 添加用户信息
                        if user_info and hasattr(user_info, "netdisk_name"):
                            baidu_lib["user_name"] = (
                                user_info.netdisk_name or user_info.baidu_name
                            )
                            baidu_lib["vip_type"] = getattr(user_info, "vip_type", 0)

                        # 添加容量信息
                        if quota_info:
                            total_bytes = getattr(quota_info, "total", None)
                            used_bytes = getattr(quota_info, "used", None)
                            free_bytes = getattr(quota_info, "free", None)

                            if total_bytes:
                                baidu_lib["size"] = self._format_size(total_bytes)
                                baidu_lib["used_size"] = (
                                    self._format_size(used_bytes)
                                    if used_bytes
                                    else "0 B"
                                )
                                baidu_lib["free_size"] = (
                                    self._format_size(free_bytes)
                                    if free_bytes
                                    else "未知"
                                )
                                baidu_lib["usage_percent"] = (
                                    round((used_bytes / total_bytes) * 100, 1)
                                    if used_bytes and total_bytes
                                    else 0
                                )
                            else:
                                baidu_lib["size"] = "未知"
                                baidu_lib["used_size"] = "未知"
                                baidu_lib["free_size"] = "未知"
                                baidu_lib["usage_percent"] = 0
                        else:
                            baidu_lib["size"] = "未知"
                            baidu_lib["used_size"] = "未知"
                            baidu_lib["free_size"] = "未知"
                            baidu_lib["usage_percent"] = 0

                        # 添加过期时间
                        if expires_at:
                            try:
                                expires_datetime = datetime.fromisoformat(
                                    expires_at.replace("Z", "+00:00")
                                )
                                baidu_lib["expires_at"] = expires_datetime.strftime(
                                    "%Y-%m-%d %H:%M:%S"
                                )
                                baidu_lib["last_modified"] = expires_datetime.strftime(
                                    "%Y-%m-%d"
                                )
                            except:
                                baidu_lib["expires_at"] = expires_at
                                baidu_lib["last_modified"] = ""
                        else:
                            baidu_lib["expires_at"] = ""
                            baidu_lib["last_modified"] = ""

                        network_libs.append(baidu_lib)
                        logger.info(f"成功获取百度网盘信息，用户: {user_id}")
                    else:
                        logger.warning(f"用户 {user_id} 的百度网盘token无效")
                else:
                    logger.info(f"用户 {user_id} 未连接百度网盘或token已过期")

            return Response({"success": True, "network_libs": network_libs})

        except Exception as e:
            logger.error(f"获取网络库列表失败: {str(e)}")
            return api_error(
                status.HTTP_500_INTERNAL_SERVER_ERROR, "获取网络库列表失败"
            )


class BaiduNetdiskFilesView(APIView):
    """百度网盘文件列表API"""

    authentication_classes = (SessionAuthentication, TokenAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _get_token_from_ndproxy(self, user_id):
        """从NDPROXY获取用户的百度网盘token信息"""
        ndproxy_url = getattr(settings, "NDPROXY_URL", "")
        if not ndproxy_url:
            logger.warning("NDPROXY_URL未配置")
            return None

        api_url = f"{ndproxy_url.rstrip('/')}/api/v1/auth/baidu/token"
        ssl_verify = getattr(settings, "NDPROXY_SSL_VERIFY", True)

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Seahub-BaiduNetdisk/1.0",
        }

        try:
            logger.info(f"正在从NDPROXY获取token信息: {api_url}")
            response = requests.get(
                api_url,
                params={"seafile_user": user_id},
                headers=headers,
                timeout=30,
                verify=ssl_verify,
            )

            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("code") == 200:
                    token_data = response_data.get("data", {})
                    logger.info(f"成功获取token信息，用户: {user_id}")
                    return token_data
                else:
                    logger.error(
                        f"NDPROXY返回业务错误: code={response_data.get('code')}, "
                        f"message={response_data.get('message')}"
                    )
                    return None
            else:
                logger.error(
                    f"NDPROXY返回错误状态: {response.status_code}, 响应: {response.text}"
                )
                return None

        except requests.RequestException as e:
            logger.error(f"从NDPROXY获取token时网络错误: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"从NDPROXY获取token时发生错误: {str(e)}")
            return None

    def _get_baidu_file_list(self, access_token, dir_path="/", start=0, limit=1000):
        """使用百度SDK获取文件列表"""
        try:
            config = Configuration()
            api_client = ApiClient(configuration=config)
            fileinfo_api = FileinfoApi(api_client)

            # 获取文件列表
            file_list_response = fileinfo_api.xpanfilelist(
                access_token=access_token,
                dir=dir_path,
                start=str(start),
                limit=limit,
                order="name",  # 按名称排序
                desc=0,  # 升序
                web=str(1),
            )
            return file_list_response

        except Exception as e:
            logger.error(f"获取百度文件列表失败: {str(e)}")
            return None

    def _format_size(self, size_bytes):
        """格式化存储大小"""
        if size_bytes is None:
            return "未知"

        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"

    def _format_time(self, timestamp):
        """格式化时间戳"""
        if timestamp is None:
            return ""
        try:
            dt = datetime.fromtimestamp(timestamp)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except:
            return ""

    def _get_file_icon_url(self, item):
        """根据文件类型获取seafile原生图标URL"""
        from django.conf import settings

        # 获取媒体URL前缀
        media_url = getattr(settings, "MEDIA_URL", "/media/")

        if item.get("isdir", 0) == 1:
            # 文件夹图标
            return f"{media_url}img/folder-24.png"

        filename = item.get("server_filename", "")
        ext = filename.lower().split(".")[-1] if "." in filename else ""

        # 映射文件扩展名到seafile原生图标文件名（参考utils.js中的FILEEXT_ICON_MAP）
        icon_map = {
            # 文档类
            "doc": "word.png",
            "docx": "word.png",
            "odt": "word.png",
            "fodt": "word.png",
            "pdf": "pdf.png",
            "txt": "txt.png",
            "rtf": "txt.png",
            "md": "md.png",
            # 表格类
            "xls": "excel.png",
            "xlsx": "excel.png",
            "ods": "excel.png",
            "fods": "excel.png",
            "csv": "excel.png",
            # 演示文稿
            "ppt": "ppt.png",
            "pptx": "ppt.png",
            "odp": "ppt.png",
            "fodp": "ppt.png",
            # 图片类
            "jpg": "pic.png",
            "jpeg": "pic.png",
            "png": "pic.png",
            "gif": "pic.png",
            "bmp": "pic.png",
            "svg": "pic.png",
            "webp": "pic.png",
            "ico": "pic.png",
            "heic": "pic.png",
            "tif": "pic.png",
            "tiff": "pic.png",
            "jfif": "pic.png",
            "draw": "draw.png",
            "psd": "psd.png",
            # 视频类
            "mp4": "video.png",
            "ogv": "video.png",
            "webm": "video.png",
            "mov": "video.png",
            "flv": "video.png",
            "wmv": "video.png",
            "rmvb": "video.png",
            "avi": "video.png",
            # 音频类
            "mp3": "music.png",
            "oga": "music.png",
            "ogg": "music.png",
            "wav": "music.png",
            "flac": "music.png",
            "opus": "music.png",
            "aac": "music.png",
            "ac3": "music.png",
            "wma": "music.png",
            # 压缩包
            "zip": "zip.png",
            "rar": "zip.png",
            "tar": "zip.png",
            "7z": "zip.png",
            "gz": "zip.png",
            # 代码类
            "css": "css.png",
            "py": "file.png",
            "js": "file.png",
            "html": "file.png",
            "java": "file.png",
            "cpp": "file.png",
            "c": "file.png",
            "php": "file.png",
            "go": "file.png",
            "rs": "file.png",
            # SeaDoc
            "sdoc": "sdoc.png",
        }

        icon_filename = icon_map.get(ext, "file.png")
        return f"{media_url}img/file/256/{icon_filename}"

    def get(self, request):
        """获取百度网盘文件列表"""
        try:
            # 检查是否启用了百度网盘功能
            enable_baidu = getattr(settings, "ENABLE_BAIDU_NETDISK", False)
            if not enable_baidu:
                return api_error(status.HTTP_404_NOT_FOUND, "百度网盘功能未启用")

            user_id = request.user.username
            dir_path = request.GET.get("path", "/")
            start = int(request.GET.get("start", 0))
            limit = int(request.GET.get("limit", 1000))

            # 从NDPROXY获取token信息
            token_data = self._get_token_from_ndproxy(user_id)

            if not token_data or not token_data.get("is_active", False):
                return api_error(
                    status.HTTP_401_UNAUTHORIZED, "百度网盘未连接或token已过期"
                )

            access_token = token_data.get("access_token")
            if not access_token:
                return api_error(status.HTTP_401_UNAUTHORIZED, "无效的访问token")

            # 获取百度文件列表
            file_list_response = self._get_baidu_file_list(
                access_token, dir_path, start, limit
            )

            if not file_list_response:
                return api_error(
                    status.HTTP_500_INTERNAL_SERVER_ERROR, "获取文件列表失败"
                )

            # 解析响应数据
            file_list = []

            # 检查是否是字典且包含list键
            # 在这里设置断点进行调试 👈 点击此行左边设置断点
            if isinstance(file_list_response, dict) and "list" in file_list_response:
                file_list_data = file_list_response.get("list", [])
                logger.info(f"📋 [DEBUG] 找到文件列表，长度: {len(file_list_data)}")

                for i, item in enumerate(file_list_data):
                    logger.info(f"📄 [DEBUG] 文件 {i}: {item}")
                    file_info = {
                        "name": item.get("server_filename", ""),
                        "path": item.get("path", ""),
                        "size": self._format_size(item.get("size", 0)),
                        "size_bytes": item.get("size", 0),
                        "mtime": self._format_time(item.get("server_mtime", 0)),
                        "mtime_timestamp": item.get("server_mtime", 0),
                        "is_dir": item.get("isdir", 0) == 1,
                        "icon_url": self._get_file_icon_url(item),
                        "fs_id": item.get("fs_id", ""),
                        "md5": item.get("md5", ""),
                        "category": item.get("category", 0),
                    }
                    file_list.append(file_info)
                    logger.info(f"✅ [DEBUG] 处理后的文件信息: {file_info}")
            else:
                logger.error(f"❌ [DEBUG] 无法解析文件列表: {file_list_response}")
                logger.error(f"🔍 [DEBUG] 响应类型: {type(file_list_response)}")
                if isinstance(file_list_response, dict):
                    logger.error(
                        f"🔍 [DEBUG] 字典键: {list(file_list_response.keys())}"
                    )

            logger.info(f"📊 [DEBUG] 最终文件列表长度: {len(file_list)}")
            print(f"Final file_list: {file_list}")

            # 构建面包屑导航
            breadcrumbs = []
            if dir_path != "/":
                path_parts = dir_path.strip("/").split("/")
                current_path = ""
                breadcrumbs.append({"name": "根目录", "path": "/"})
                for part in path_parts:
                    if part:
                        current_path += "/" + part
                        breadcrumbs.append({"name": part, "path": current_path})
            else:
                breadcrumbs.append({"name": "根目录", "path": "/"})

            return Response(
                {
                    "success": True,
                    "files": file_list,
                    "current_path": dir_path,
                    "breadcrumbs": breadcrumbs,
                    "has_more": hasattr(file_list_response, "has_more")
                    and file_list_response.has_more,
                    "cursor": getattr(file_list_response, "cursor", ""),
                }
            )

        except Exception as e:
            logger.error(f"获取百度网盘文件列表失败: {str(e)}")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "获取文件列表失败")
