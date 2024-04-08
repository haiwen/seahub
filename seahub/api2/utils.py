# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
# Utility functions for api2

import os
import time
import json
import re
import logging

from collections import defaultdict
from functools import wraps

from django.http import HttpResponse
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework import status, serializers
from seaserv import seafile_api, ccnet_api, \
        get_group, seafserv_threaded_rpc
from pysearpc import SearpcError

from seahub.base.templatetags.seahub_tags import email2nickname, \
    translate_seahub_time, file_icon_filter, email2contact_email
from seahub.group.views import is_group_staff
from seahub.group.utils import is_group_member
from seahub.api2.models import Token, TokenV2, DESKTOP_PLATFORMS
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.avatar.templatetags.avatar_tags import api_avatar_url

logger = logging.getLogger(__name__)

def api_error(code, msg):
    err_resp = {'error_msg': msg}
    return Response(err_resp, status=code)

def get_file_size(store_id, repo_version, file_id):
    size = seafile_api.get_file_size(store_id, repo_version, file_id)
    return size if size else 0

def prepare_starred_files(files):
    array = []
    for f in files:
        sfile = {'org' : f.org_id,
                 'repo' : f.repo.id,
                 'repo_id' : f.repo.id,
                 'repo_name' : f.repo.name,
                 'path' : f.path,
                 'icon_path' : file_icon_filter(f.path),
                 'file_name' : os.path.basename(f.path),
                 'mtime' : f.last_modified,
                 'mtime_relative': translate_seahub_time(f.last_modified),
                 'dir' : f.is_dir,
                 'repo_encrypted' : f.repo.encrypted
                 }
        if not f.is_dir:
            try:
                file_id = seafile_api.get_file_id_by_path(f.repo.id, f.path)
                sfile['oid'] = file_id
                sfile['size'] = get_file_size(f.repo.store_id, f.repo.version, file_id)
            except SearpcError as e:
                logger.error(e)
                pass

        array.append(sfile)

    return array

def get_groups(email):
    group_json = []

    joined_groups = ccnet_api.get_groups(email)
    grpmsgs = {}
    for g in joined_groups:
        grpmsgs[g.id] = 0

    replynum = 0

    for g in joined_groups:
        group = {
            "id": g.id,
            "name": g.group_name,
            "creator": g.creator_name,
            "ctime": g.timestamp,
            "msgnum": grpmsgs[g.id],
            }
        group_json.append(group)

    return group_json, replynum

def get_timestamp(msgtimestamp):
    if not msgtimestamp:
        return 0
    timestamp = int(time.mktime(msgtimestamp.timetuple()))
    return timestamp

def api_group_check(func):
    """
    Decorator for initial group permission check tasks

    un-login user & group not pub --> login page
    un-login user & group pub --> view_perm = "pub"
    login user & non group member & group not pub --> public info page
    login user & non group member & group pub --> view_perm = "pub"
    group member --> view_perm = "joined"
    sys admin --> view_perm = "sys_admin"
    """
    def _decorated(view, request, group_id, *args, **kwargs):
        group_id_int = int(group_id) # Checked by URL Conf
        group = get_group(group_id_int)
        if not group:
            return api_error(status.HTTP_404_NOT_FOUND, 'Group not found.')
        group.is_staff = False
        group.is_pub = False

        joined = is_group_member(group_id_int, request.user.username)
        if joined:
            group.view_perm = "joined"
            group.is_staff = is_group_staff(group, request.user)
            return func(view, request, group, *args, **kwargs)
        if request.user.is_staff:
            # viewed by system admin
            group.view_perm = "sys_admin"
            return func(view, request, group, *args, **kwargs)

        if group.is_pub:
            group.view_perm = "pub"
            return func(view, request, group, *args, **kwargs)

        # Return group public info page.
        return api_error(status.HTTP_403_FORBIDDEN, 'Forbid to access this group.')

    return _decorated

def get_client_ip(request):
    x_forwarded_for = request.headers.get('x-forwarded-for', '')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR', '')

    return ip

def get_diff_details(repo_id, commit1, commit2):
    result = defaultdict(list)

    diff_result = seafserv_threaded_rpc.get_diff(repo_id, commit1, commit2)
    if not diff_result:
        return result

    for d in diff_result:
        if d.status == 'add':
            result['added_files'].append(d.name)
        elif d.status == 'del':
            result['deleted_files'].append(d.name)
        elif d.status == 'mov':
            result['renamed_files'].extend((d.name, d.new_name))
        elif d.status == 'mod':
            result['modified_files'].append(d.name)
        elif d.status == 'newdir':
            result['added_dirs'].append(d.name)
        elif d.status == 'deldir':
            result['deleted_dirs'].append(d.name)

    return result

JSON_CONTENT_TYPE = 'application/json; charset=utf-8'
def json_response(func):
    @wraps(func)
    def wrapped(*a, **kw):
        result = func(*a, **kw)
        if isinstance(result, HttpResponse):
            return result
        else:
            return HttpResponse(json.dumps(result), status=200,
                                content_type=JSON_CONTENT_TYPE)
    return wrapped

def get_token_v1(username):
    token, _ = Token.objects.get_or_create(user=username)
    return token

_ANDROID_DEVICE_ID_PATTERN = re.compile('^[a-f0-9]{1,16}$')
def get_token_v2(request, username, platform, device_id, device_name,
                 client_version, platform_version):

    if platform in DESKTOP_PLATFORMS:
        # desktop device id is the peer id, so it must be 40 chars
        if len(device_id) != 40:
            raise serializers.ValidationError('invalid device id')

    elif platform == 'android':
        # See http://developer.android.com/reference/android/provider/Settings.Secure.html#ANDROID_ID
        # android device id is the 64bit secure id, so it must be 16 chars in hex representation
        # but some user reports their device ids are 14 or 15 chars long. So we relax the validation.
        if not _ANDROID_DEVICE_ID_PATTERN.match(device_id.lower()):
            raise serializers.ValidationError('invalid device id')
    elif platform == 'ios':
        if len(device_id) != 36:
            raise serializers.ValidationError('invalid device id')
    else:
        raise serializers.ValidationError('invalid platform')

    return TokenV2.objects.get_or_create_token(
        username, platform, device_id, device_name,
        client_version, platform_version, get_client_ip(request))

def get_api_token(request, keys=None, key_prefix='shib_'):

    if not keys:
        keys = [
            'platform',
            'device_id',
            'device_name',
            'client_version',
            'platform_version',
        ]

    if key_prefix:
        keys = [key_prefix + item for item in keys]

    if all([key in request.GET for key in keys]):

        platform = request.GET['%splatform' % key_prefix]
        device_id = request.GET['%sdevice_id' % key_prefix]
        device_name = request.GET['%sdevice_name' % key_prefix]
        client_version = request.GET['%sclient_version' % key_prefix]
        platform_version = request.GET['%splatform_version' % key_prefix]

        token = get_token_v2(request, request.user.username, platform,
                             device_id, device_name, client_version,
                             platform_version)

    elif all([key in request.session for key in keys]):
        platform = request.session['%splatform' % key_prefix]
        device_id = request.session['%sdevice_id' % key_prefix]
        device_name = request.session['%sdevice_name' % key_prefix]
        client_version = request.session['%sclient_version' % key_prefix]
        platform_version = request.session['%splatform_version' % key_prefix]
        token = get_token_v2(
            request, request.user.username, platform, device_id,
            device_name, client_version, platform_version)

    else:
        token = get_token_v1(request.user.username)

    return token

def to_python_boolean(string):
    """Convert a string to boolean.
    """
    string = string.lower()
    if string in ('t', 'true', '1'):
        return True
    if string in ('f', 'false', '0'):
        return False
    raise ValueError("Invalid boolean value: '%s'" % string)

def get_user_common_info(email, avatar_size=AVATAR_DEFAULT_SIZE):
    avatar_url, is_default, date_uploaded = api_avatar_url(email, avatar_size)
    return {
        "email": email,
        "name": email2nickname(email),
        "contact_email": email2contact_email(email),
        "avatar_url": avatar_url
    }

def user_to_dict(email, request=None, avatar_size=AVATAR_DEFAULT_SIZE):
    d = get_user_common_info(email, avatar_size)
    return {
        'user_name': d['name'],
        'user_email': d['email'],
        'user_contact_email': d['contact_email'],
        'avatar_url': d['avatar_url'],
    }

def is_web_request(request):
    if isinstance(request.successful_authenticator, SessionAuthentication):
        return True
    else:
        return False
