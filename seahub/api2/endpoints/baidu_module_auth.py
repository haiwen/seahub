#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
百度网盘模块JWT认证端点
这是对Seahub的唯一修改 - 添加一个生成JWT token的API
"""

import jwt
import time
import logging
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.utils import JWT_PRIVATE_KEY

logger = logging.getLogger(__name__)


class BaiduModuleJWTToken(APIView):
    """
    为百度网盘模块生成JWT Token
    只能通过已认证的session调用
    """

    authentication_classes = (SessionAuthentication,)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """
        生成百度网盘模块专用的JWT token

        POST /api/v2.1/baidu-module/jwt-token/
        """
        try:
            username = request.user.username

            # 生成JWT payload
            payload = {
                "username": username,
                "module": "baidu_netdisk",
                "is_internal": True,
                "iat": int(time.time()),
                "exp": int(time.time()) + 24 * 3600,  # 24小时有效期
            }

            # 生成JWT token
            token = jwt.encode(payload, JWT_PRIVATE_KEY, algorithm="HS256")

            # 返回token和用户基本信息
            return Response(
                {
                    "token": token,
                    "username": username,
                    "expires_in": 24 * 3600,
                    "token_type": "JWT",
                }
            )

        except Exception as e:
            logger.error(f"生成JWT token失败: {e}")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "生成token失败")

    def get(self, request):
        """
        验证当前session状态并返回用户信息

        GET /api/v2.1/baidu-module/jwt-token/
        """
        try:
            username = request.user.username

            # 获取用户的基本信息
            from seahub.base.templatetags.seahub_tags import email2nickname
            from seahub.avatar.templatetags.avatar_tags import api_avatar_url

            avatar_url, _, _ = api_avatar_url(username, 80)
            nickname = email2nickname(username)

            return Response(
                {
                    "username": username,
                    "nickname": nickname,
                    "avatar_url": avatar_url,
                    "is_authenticated": True,
                }
            )

        except Exception as e:
            logger.error(f"获取用户信息失败: {e}")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, "获取用户信息失败")
