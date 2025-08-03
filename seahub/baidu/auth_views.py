# -*- coding: utf-8 -*-
import logging
import requests
import urllib3
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

# 禁用SSL警告（当使用自签名证书时）
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


class BaiduNetdiskAuthView(APIView):
    """百度网盘授权相关API端点"""

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """获取百度网盘授权URL"""
        try:
            # 调试信息：显示当前用户
            logger.info(
                f"当前用户: {request.user.username}, "
                f"是否认证: {request.user.is_authenticated}"
            )
            # 从配置中获取百度网盘应用信息
            app_key = getattr(settings, "BAIDU_NETDISK_APP_KEY", "")
            redirect_uri = getattr(settings, "BAIDU_NETDISK_REDIRECT_URI", "")

            if not app_key or not redirect_uri:
                return api_error(
                    status.HTTP_400_BAD_REQUEST, "百度网盘应用配置不完整，请联系管理员"
                )

            # 构建授权URL - 使用oob模式进行手工输入授权码
            auth_url = (
                f"https://openapi.baidu.com/oauth/2.0/authorize?"
                f"response_type=code&"
                f"client_id={app_key}&"
                f"redirect_uri=oob&"
                f"scope=basic,netdisk&"
                f"display=page&"
                f"qrcode=1&"
                f"state={request.user.username}"  # 使用用户名作为state参数
            )

            # 添加调试日志
            logger.info(f"Generated auth URL: {auth_url}")

            return Response(
                {"auth_url": auth_url, "app_key": app_key, "redirect_uri": redirect_uri}
            )

        except Exception as e:
            logger.error(f"获取百度网盘授权URL失败: {str(e)}")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "获取授权URL失败")

    def post(self, request):
        """处理授权码，获取访问令牌"""
        try:
            code = request.data.get("code")
            state = request.data.get("state")

            if not code:
                return api_error(status.HTTP_400_BAD_REQUEST, "授权码不能为空")

            # 验证state参数（可选，用于防止CSRF攻击）
            if state and state != request.user.username:
                return api_error(status.HTTP_400_BAD_REQUEST, "状态参数验证失败")

            # 从配置中获取应用信息
            app_key = getattr(settings, "BAIDU_NETDISK_APP_KEY", "")
            app_secret = getattr(settings, "BAIDU_NETDISK_APP_SECRET", "")

            if not all([app_key, app_secret]):
                return api_error(status.HTTP_400_BAD_REQUEST, "百度网盘应用配置不完整")

            # 根据百度文档，使用授权码获取Access Token
            token_url = "https://openapi.baidu.com/oauth/2.0/token"
            token_params = {
                "grant_type": "authorization_code",
                "code": code,
                "client_id": app_key,
                "client_secret": app_secret,
                "redirect_uri": "oob",  # oob模式，必须与获取授权码时保持一致
            }

            # 添加百度推荐的User-Agent
            headers = {"User-Agent": "pan.baidu.com"}

            logger.info(f"正在获取百度网盘Access Token，用户: {request.user.username}")

            # 发送请求获取Access Token
            token_response = requests.get(
                token_url, params=token_params, headers=headers, timeout=30
            )
            token_data = token_response.json()

            logger.info(f"百度网盘Token响应: {token_data}")

            # 检查是否有错误
            if "error" in token_data:
                logger.error(f"获取百度网盘访问令牌失败: {token_data}")
                error_desc = token_data.get("error_description", "未知错误")
                return api_error(
                    status.HTTP_400_BAD_REQUEST,
                    f"获取访问令牌失败: {error_desc}",
                )

            # 提取令牌信息
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in")
            scope = token_data.get("scope")

            if not access_token:
                logger.error(f"响应中缺少access_token: {token_data}")
                return api_error(
                    status.HTTP_400_BAD_REQUEST, "获取访问令牌失败：响应格式异常"
                )

            # 获取用户网盘信息验证令牌有效性
            user_info_url = "https://pan.baidu.com/rest/2.0/xpan/nas"
            user_info_params = {"method": "uinfo", "access_token": access_token}

            user_info_response = requests.get(
                user_info_url, params=user_info_params, headers=headers, timeout=30
            )
            user_info_data = user_info_response.json()

            logger.info(f"百度网盘用户信息响应: {user_info_data}")

            if user_info_data.get("errno") != 0:
                logger.error(f"获取百度网盘用户信息失败: {user_info_data}")
                errmsg = user_info_data.get("errmsg", "未知错误")
                return api_error(
                    status.HTTP_400_BAD_REQUEST, f"获取用户信息失败: {errmsg}"
                )

            # 准备返回结果 - 只返回状态信息，不暴露token
            result = {
                "success": True,
                "message": "百度网盘授权成功",
                "status_code": 200,
                "user_info": {
                    "baidu_name": user_info_data.get("baidu_name", ""),
                    "netdisk_name": user_info_data.get("netdisk_name", ""),
                    "vip_type": user_info_data.get("vip_type", 0),
                },
            }

            logger.info(f"百度网盘授权成功，用户: {request.user.username}")

            # 调用外部百度网盘代理模块
            try:
                self._send_token_to_ndproxy(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    expires_in=expires_in,
                    scope=scope,
                    seafile_user=request.user.username,
                )
            except Exception as e:
                logger.error(f"发送token到NDPROXY模块失败: {str(e)}")
                # 不影响主流程，继续返回成功结果

            return Response(result)

        except requests.RequestException as e:
            logger.error(f"网络请求失败: {str(e)}")
            return api_error(
                status.HTTP_500_INTERNAL_SERVER_ERROR, "网络请求失败，请稍后重试"
            )
        except Exception as e:
            logger.error(f"处理百度网盘授权失败: {str(e)}")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "授权处理失败")

    def _send_token_to_ndproxy(
        self, access_token, refresh_token, expires_in, scope, seafile_user
    ):
        """将token信息发送到NDPROXY模块"""
        ndproxy_url = getattr(settings, "NDPROXY_URL", "")

        if not ndproxy_url:
            logger.warning("NDPROXY_URL未配置，跳过token发送")
            return

        # 构建API端点URL
        api_url = f"{ndproxy_url.rstrip('/')}/api/v1/auth/baidu/token"

        # 准备发送的数据
        token_data = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "scope": scope,
            "seafile_user": seafile_user,
        }

        # 设置请求头
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Seahub-BaiduNetdisk/1.0",
        }

        logger.info(f"正在发送token到NDPROXY模块: {api_url}")
        logger.debug(f"发送数据: {token_data}")

        # 获取SSL验证配置
        ssl_verify = getattr(settings, "NDPROXY_SSL_VERIFY", True)
        if not ssl_verify:
            logger.warning("NDPROXY SSL证书验证已禁用，这可能存在安全风险")

        try:
            # 发送POST请求 - SSL验证根据配置决定
            response = requests.post(
                api_url, json=token_data, headers=headers, timeout=30, verify=ssl_verify
            )

            # 检查响应状态
            if response.status_code == 200:
                logger.info(f"成功发送token到NDPROXY模块，用户: {seafile_user}")
                logger.debug(f"NDPROXY响应: {response.text}")
            else:
                logger.error(
                    f"NDPROXY模块返回错误状态: {response.status_code}, "
                    f"响应: {response.text}"
                )
                raise Exception(f"NDPROXY返回状态码: {response.status_code}")

        except requests.RequestException as e:
            logger.error(f"发送token到NDPROXY模块时网络错误: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"发送token到NDPROXY模块时发生错误: {str(e)}")
            raise


class BaiduTokenRefreshView(APIView):
    """百度网盘刷新令牌视图"""

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """刷新Access Token"""
        try:
            refresh_token = request.data.get("refresh_token")

            if not refresh_token:
                return api_error(status.HTTP_400_BAD_REQUEST, "刷新令牌不能为空")

            # 从配置中获取应用信息
            app_key = getattr(settings, "BAIDU_NETDISK_APP_KEY", "")
            app_secret = getattr(settings, "BAIDU_NETDISK_APP_SECRET", "")

            if not all([app_key, app_secret]):
                return api_error(status.HTTP_400_BAD_REQUEST, "百度网盘应用配置不完整")

            # 根据百度文档，刷新Access Token
            token_url = "https://openapi.baidu.com/oauth/2.0/token"
            token_params = {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": app_key,
                "client_secret": app_secret,
            }

            # 添加百度推荐的User-Agent
            headers = {"User-Agent": "pan.baidu.com"}

            logger.info(f"正在刷新百度网盘Access Token，用户: {request.user.username}")

            # 发送请求刷新Access Token
            token_response = requests.get(
                token_url, params=token_params, headers=headers, timeout=30
            )
            token_data = token_response.json()

            logger.info(f"百度网盘Token刷新响应: {token_data}")

            # 检查是否有错误
            if "error" in token_data:
                logger.error(f"刷新百度网盘访问令牌失败: {token_data}")
                error_desc = token_data.get("error_description", "未知错误")
                return api_error(
                    status.HTTP_400_BAD_REQUEST,
                    f"刷新访问令牌失败: {error_desc}",
                )

            # 提取令牌信息
            access_token = token_data.get("access_token")
            new_refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in")
            scope = token_data.get("scope")

            if not access_token:
                logger.error(f"刷新响应中缺少access_token: {token_data}")
                return api_error(
                    status.HTTP_400_BAD_REQUEST, "刷新访问令牌失败：响应格式异常"
                )

            # 准备返回结果 - 只返回状态信息，不暴露token
            result = {
                "success": True,
                "message": "百度网盘令牌刷新成功",
                "status_code": 200,
            }

            logger.info(f"百度网盘令牌刷新成功，用户: {request.user.username}")

            # 调用外部百度网盘代理模块
            try:
                self._send_token_to_ndproxy(
                    access_token=access_token,
                    refresh_token=new_refresh_token,
                    expires_in=expires_in,
                    scope=scope,
                    seafile_user=request.user.username,
                )
            except Exception as e:
                logger.error(f"发送刷新token到NDPROXY模块失败: {str(e)}")
                # 不影响主流程，继续返回成功结果

            return Response(result)

        except requests.RequestException as e:
            logger.error(f"网络请求失败: {str(e)}")
            return api_error(
                status.HTTP_500_INTERNAL_SERVER_ERROR, "网络请求失败，请稍后重试"
            )
        except Exception as e:
            logger.error(f"刷新百度网盘令牌失败: {str(e)}")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "令牌刷新失败")

    def _send_token_to_ndproxy(
        self, access_token, refresh_token, expires_in, scope, seafile_user
    ):
        """将token信息发送到NDPROXY模块"""
        ndproxy_url = getattr(settings, "NDPROXY_URL", "")

        if not ndproxy_url:
            logger.warning("NDPROXY_URL未配置，跳过token发送")
            return

        # 构建API端点URL
        api_url = f"{ndproxy_url.rstrip('/')}/api/v1/auth/baidu/token"

        # 准备发送的数据
        token_data = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": expires_in,
            "scope": scope,
            "seafile_user": seafile_user,
        }

        # 设置请求头
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Seahub-BaiduNetdisk/1.0",
        }

        logger.info(f"正在发送token到NDPROXY模块: {api_url}")
        logger.debug(f"发送数据: {token_data}")

        # 获取SSL验证配置
        ssl_verify = getattr(settings, "NDPROXY_SSL_VERIFY", True)
        if not ssl_verify:
            logger.warning("NDPROXY SSL证书验证已禁用，这可能存在安全风险")

        try:
            # 发送POST请求 - SSL验证根据配置决定
            response = requests.post(
                api_url, json=token_data, headers=headers, timeout=30, verify=ssl_verify
            )

            # 检查响应状态
            if response.status_code == 200:
                logger.info(f"成功发送token到NDPROXY模块，用户: {seafile_user}")
                logger.debug(f"NDPROXY响应: {response.text}")
            else:
                logger.error(
                    f"NDPROXY模块返回错误状态: {response.status_code}, "
                    f"响应: {response.text}"
                )
                raise Exception(f"NDPROXY返回状态码: {response.status_code}")

        except requests.RequestException as e:
            logger.error(f"发送token到NDPROXY模块时网络错误: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"发送token到NDPROXY模块时发生错误: {str(e)}")
            raise
