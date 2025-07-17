# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import os
import json
import logging
import requests

from rest_framework.views import APIView

from django.http import HttpResponse
from django.core.cache import cache

from seaserv import seafile_api

from seahub.utils import gen_inner_file_upload_url, gen_file_get_url
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.avatar.templatetags.avatar_tags import api_avatar_url

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'


def _get_file_version(file_id):
    if not cache.get(file_id):
        cache.set(file_id, 1)
    return cache.get(file_id)


def _set_file_version(file_id):
    version = _get_file_version(file_id) + 1
    cache.set(file_id, version)


class WebofficeFileInfoView(APIView):

    def get(self, request):

        """ 获取文件信息
        """

        wps_file_id = request.META.get('HTTP_X_WEBOFFICE_FILE_ID', '')
        if not wps_file_id:
            logger.error('wps_file_id is empty')
            logger.error(request.META)
            error_resp = {
                "code": 40005,
                "message": "InvalidArgument",
                "details": "参数错误",
                "hint": "wps_file_id is empty"
            }
            return HttpResponse(json.dumps({error_resp}), status=200,
                                content_type=json_content_type)

        doc_info = cache.get(wps_file_id)
        username = doc_info['username']
        repo_id = doc_info['repo_id']
        file_path = doc_info['file_path']
        can_edit = doc_info['can_edit']

        file_name = os.path.basename(file_path)
        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        download_token = seafile_api.get_fileserver_access_token(repo_id,
                                                                 file_id,
                                                                 'download',
                                                                 username,
                                                                 use_onetime=False)

        download_url = gen_file_get_url(download_token, file_name)
        dirent = seafile_api.get_dirent_by_path(repo_id, file_path)
        repo_owner = seafile_api.get_repo_owner(repo_id)
        if not repo_owner:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)

        avatar_url, _, _ = api_avatar_url(username, int(72))

        result = {
            "file": {
                "id": wps_file_id,  # 文件id,字符串长度不超过64位
                "name": file_name,  # 文件名必须带后缀
                "version": _get_file_version(wps_file_id),  # 文档版本号，从1开始累加，位数小于11
                "size": dirent.size,  # 文档大小，单位为字节；此处需传文件真实大小，否则会出现异常
                "creator": email2contact_email(repo_owner),  # 创建者id，字符串长度不超过32位
                "create_time": dirent.mtime,  # 创建时间，时间戳，单位为秒
                "modifier": email2contact_email(dirent.modifier),  # 修改者id，字符串长度不超过32位
                "modify_time": dirent.mtime,  # 最近修改时间，时间戳，单位为
                "download_url": download_url,  # 文档下载地址

                # 限制预览页数（不超过5000）
                # 1. 用户操作权限 user.permission 为 write 时，限制不生效；
                # 2. 用户操作权限 user.permission 为 read 时，
                # previewPages 默认值为 0，不限制预览页数；
                # previewPages >= 1 时，限制生效，限制的页数为
                # previewPages 字段的值
                "preview_pages": 0,
            },
            "user": {
                "id": username,  # 用户id，长度小于32
                "name": email2nickname(username),  # 用户名称
                "permission": "write" if can_edit else "read",  # 用户操作权限，write：可编辑，read：预览
                "avatar_url": avatar_url  # 用户头像
            }
        }

        return HttpResponse(json.dumps(result), status=200,
                            content_type=json_content_type)


class WebofficeUserInfoView(APIView):

    def post(self, request):
        """  获用户信息
        """

        user_list = []
        user_ids = request.data.get('ids', [])
        for user_id in [user_ids]:

            if not user_id:
                continue

            avatar_url, _, _ = api_avatar_url(user_id, int(72))
            user_info_dict = {
                "id": user_id,  # 用户ID 字符串长度小于32
                "name": email2nickname(user_id),  # 用户名
                "avatar_url": avatar_url  # 用户头像
            }

            user_list.append(user_info_dict)

        result = {
            "users": user_list
        }
        return HttpResponse(json.dumps(result), status=200,
                            content_type=json_content_type)


class WebofficeFileSaveView(APIView):

    def post(self, request):
        """ Weboffice endpoint for save file content
        """

        wps_file_id = request.META.get('HTTP_X_WEBOFFICE_FILE_ID', '')
        if not wps_file_id:
            logger.error('wps_file_id is empty')
            logger.error(request.META)
            error_resp = {
                "code": 40005,
                "message": "InvalidArgument",
                "details": "参数错误",
                "hint": "wps_file_id is empty"
            }
            return HttpResponse(json.dumps({error_resp}), status=200,
                                content_type=json_content_type)

        doc_info = cache.get(wps_file_id)
        username = doc_info['username']
        repo_id = doc_info['repo_id']
        file_path = doc_info['file_path']

        try:
            file_obj = request.data.get('file')

            # get file update url
            fake_obj_id = {'online_office_update': True}
            token = seafile_api.get_fileserver_access_token(repo_id,
                                                            json.dumps(fake_obj_id),
                                                            'update',
                                                            username)

            if not token:
                error_resp = {
                    "code": 50001,
                    "message": "ServerError",
                    "details": "对接系统错误",
                    "hint": "fileserver access token is empty"
                }
                return HttpResponse(json.dumps({error_resp}), status=500,
                                    content_type=json_content_type)

            update_url = gen_inner_file_upload_url('update-api', token)

            # update file
            files = {
                'file': file_obj,
                'file_name': os.path.basename(file_path),
                'target_file': file_path,
            }
            requests.post(update_url, files=files)
            _set_file_version(wps_file_id)
        except Exception as e:
            logger.error(e)
            error_resp = {
                "code": 50001,
                "message": "ServerError",
                "details": "对接系统错误",
                "hint": f"{e}"
            }
            return HttpResponse(json.dumps({error_resp}), status=200,
                                content_type=json_content_type)

        file_name = os.path.basename(file_path)
        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        download_token = seafile_api.get_fileserver_access_token(repo_id,
                                                                 file_id,
                                                                 'download',
                                                                 username,
                                                                 use_onetime=False)

        repo = seafile_api.get_repo(repo_id)
        file_size = seafile_api.get_file_size(repo.store_id, repo.version, file_id)
        download_url = gen_file_get_url(download_token, file_name)

        result = {
            "file": {
                "id": wps_file_id,  # 文件id，字符串长度小于32
                "name": file_name,  # 文件名
                "version": _get_file_version(wps_file_id),  # 当前版本号，位数小于11
                "size": file_size,  # 文件大小，单位是B
                "download_url": download_url  # 文件下载地址
            }
        }

        return HttpResponse(json.dumps(result), status=200,
                            content_type=json_content_type)


class WebofficeNotDeployedView(APIView):

    def get(self, request):
        error_resp = {
            "code": 50001,
            "message": "ServerError",
            "details": "对接系统错误",
            "hint": "Not employed"
        }
        return HttpResponse(json.dumps({error_resp}), status=200,
                            content_type=json_content_type)

    def post(self, request):
        error_resp = {
            "code": 50001,
            "message": "ServerError",
            "details": "对接系统错误",
            "hint": "Not employed"
        }
        return HttpResponse(json.dumps({error_resp}), status=200,
                            content_type=json_content_type)

    def put(self, request):
        error_resp = {
            "code": 50001,
            "message": "ServerError",
            "details": "对接系统错误",
            "hint": "Not employed"
        }
        return HttpResponse(json.dumps({error_resp}), status=200,
                            content_type=json_content_type)
