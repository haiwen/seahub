# Copyright (c) 2012-2018 Seafile Ltd.
# -*- coding: utf-8 -*-

from __future__ import unicode_literals

import json
import csv
import logging
import chardet
from io import StringIO

from django.db.models import Q
from django.shortcuts import render
from django.http import HttpResponse
from django.utils.translation import ugettext as _

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error

from seahub.utils import normalize_file_path
from seahub.views import check_folder_permission
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.group.utils import is_group_member, is_group_admin_or_owner
from seahub.group.signals import add_user_to_group
from seahub.share.models import FileShare
from seahub.avatar.util import get_alibaba_user_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname

from seahub.alibaba.models import AlibabaProfile, AlibabaUserEditFile

logger = logging.getLogger(__name__)

try:
    from seahub.settings import WINDOWS_CLIENT_PUBLIC_DOWNLOAD_URL, \
            WINDOWS_CLIENT_VERSION, APPLE_CLIENT_PUBLIC_DOWNLOAD_URL, \
            APPLE_CLIENT_VERSION, WINDOWS_CLIENT_PUBLIC_DOWNLOAD_URL_EN, \
            WINDOWS_CLIENT_VERSION_EN, APPLE_CLIENT_PUBLIC_DOWNLOAD_URL_EN, \
            APPLE_CLIENT_VERSION_EN

except ImportError:
    WINDOWS_CLIENT_PUBLIC_DOWNLOAD_URL = ''
    WINDOWS_CLIENT_VERSION = ''
    APPLE_CLIENT_PUBLIC_DOWNLOAD_URL = ''
    APPLE_CLIENT_VERSION = ''
    WINDOWS_CLIENT_PUBLIC_DOWNLOAD_URL_EN = ''
    WINDOWS_CLIENT_VERSION_EN = ''
    APPLE_CLIENT_PUBLIC_DOWNLOAD_URL_EN = ''
    APPLE_CLIENT_VERSION_EN = ''

### utils ###

def alibaba_err_msg_when_unable_to_view_file(request, repo_id):

    repo_owner = seafile_api.get_repo_owner(repo_id)
    if request.LANGUAGE_CODE in ('zh-cn', 'zh-tw'):
        return "您没有权限查看此文件，请联系 %s 添加权限" % email2nickname(repo_owner)
    else:
        return "You don't have permission to view this file, \
                please contact %s to add permission" % email2nickname(repo_owner)

### page view ###

@login_required
def alibaba_client_download_view(request):

    return render(request, 'alibaba_client_download.html', {
            'windows_client_public_download_url': WINDOWS_CLIENT_PUBLIC_DOWNLOAD_URL,
            'windows_client_version': WINDOWS_CLIENT_VERSION,
            'apple_client_public_download_url': APPLE_CLIENT_PUBLIC_DOWNLOAD_URL,
            'apple_client_version': APPLE_CLIENT_VERSION,
            'windows_client_public_download_url_en': WINDOWS_CLIENT_PUBLIC_DOWNLOAD_URL_EN,
            'windows_client_version_en': WINDOWS_CLIENT_VERSION_EN,
            'apple_client_public_download_url_en': APPLE_CLIENT_PUBLIC_DOWNLOAD_URL_EN,
            'apple_client_version_en': APPLE_CLIENT_VERSION_EN,
        })

@login_required
def alibaba_edit_profile(request):
    """
    Show and edit user profile.
    """
    username = request.user.username
    profile = AlibabaProfile.objects.get_profile(username)
    init_dict = {}
    if profile:
        init_dict['personal_photo_url'] = get_alibaba_user_avatar_url(username)
        init_dict['emp_name'] = profile.emp_name or ''
        init_dict['nick_name'] = profile.nick_name or ''
        init_dict['post_name'] = profile.post_name or ''
        init_dict['post_name_en'] = profile.post_name_en or ''
        init_dict['dept_name'] = profile.dept_name or ''
        init_dict['dept_name_en'] = profile.dept_name_en or ''

    return render(request, 'alibaba/set_profile.html', init_dict)

@login_required
def alibaba_user_profile(request, username):

    profile = AlibabaProfile.objects.get_profile(username)
    init_dict = {}
    if profile:
        init_dict['personal_photo_url'] = get_alibaba_user_avatar_url(username)
        init_dict['emp_name'] = profile.emp_name or ''
        init_dict['nick_name'] = profile.nick_name or ''
        init_dict['work_no'] = profile.work_no or ''
        init_dict['post_name'] = profile.post_name or ''
        init_dict['post_name_en'] = profile.post_name_en or ''
        init_dict['dept_name'] = profile.dept_name or ''
        init_dict['dept_name_en'] = profile.dept_name_en or ''

    return render(request, 'alibaba/user_profile.html', init_dict)

@login_required_ajax
def alibaba_ajax_group_members_import(request, group_id):
    """Import users to group.

    Permission checking:
    1. Only group admin/owner can add import group members
    """

    result = {}
    username = request.user.username
    content_type = 'application/json; charset=utf-8'

    # argument check
    uploaded_file = request.FILES['file']
    if not uploaded_file:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400,
                        content_type=content_type)

    # recourse check
    group_id = int(group_id)
    group = ccnet_api.get_group(group_id)
    if not group:
        result['error'] = _('Group does not exist')
        return HttpResponse(json.dumps(result), status=404,
                        content_type=content_type)

    # check permission
    if not is_group_admin_or_owner(group_id, username):
        result['error'] = _('Permission denied.')
        return HttpResponse(json.dumps(result), status=403,
                        content_type=content_type)

    # prepare work no list from uploaded file
    try:
        content = uploaded_file.read()
        encoding = chardet.detect(content)['encoding']
        if encoding != 'utf-8':
            content = content.decode(encoding, 'replace').encode('utf-8')

        filestream = StringIO.StringIO(content)
        reader = csv.reader(filestream)
    except Exception as e:
        logger.error(e)
        result['error'] = _('Internal Server Error')
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    work_no_list = []
    for row in reader:
        if not row:
            continue
        work_no = row[0].strip().lower()
        work_no_list.append(work_no)

    def alibaba_get_group_member_info(group_id, alibaba_profile):
        emp_name = alibaba_profile.emp_name
        nick_name = alibaba_profile.nick_name
        if nick_name:
            emp_nick_name = '%s(%s)' % (emp_name, nick_name)
        else:
            emp_nick_name = emp_name

        member_info = {
            'group_id': group_id,
            "name": emp_nick_name,
            'email': alibaba_profile.uid,
            "avatar_url": get_alibaba_user_avatar_url(alibaba_profile.uid),
        }
        return member_info

    is_cn = request.LANGUAGE_CODE in ('zh-cn', 'zh-tw')

    result = {}
    result['failed'] = []
    result['success'] = []

    # check work_no validation
    for work_no in work_no_list:

        # only digit in work_no string
        if len(work_no) < 6 and work_no.isdigit():
            work_no = '000000'[:6 - len(work_no)] + work_no

        alibaba_profile = AlibabaProfile.objects.get_profile_by_work_no(work_no)
        if not alibaba_profile or not alibaba_profile.uid:
            result['failed'].append({
                'email': work_no,
                'error_msg': '工号没找到。' if is_cn else 'Employee ID not found.'
                })
            continue

        ccnet_email = alibaba_profile.uid
        if is_group_member(group_id, ccnet_email, in_structure=False):
            result['failed'].append({
                'email': work_no,
                'error_msg': '已经是群组成员。' if is_cn else 'Is already a group member.'
                })
            continue

        try:
            ccnet_api.group_add_member(group_id, username, ccnet_email)
            member_info = alibaba_get_group_member_info(group_id,
                    alibaba_profile)
            result['success'].append(member_info)
        except Exception as e:
            logger.error(e)
            result['failed'].append({
                'email': work_no,
                'error_msg': _('Internal Server Error')
                })

        add_user_to_group.send(sender=None,
                               group_staff=username,
                               group_id=group_id,
                               added_user=ccnet_email)

    return HttpResponse(json.dumps(result), content_type=content_type)

### alibaba api ###

class AlibabaSearchUser(APIView):
    """ Search user from alibaba profile
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, format=None):

        q = request.GET.get('q', None)
        if not q:
            error_msg = 'q invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # only digit in q string
        # search by work no
        if len(q) < 6 and q.isdigit():
            q = '000000'[:6 - len(q)] + q

        if '@' in q:
            q = q.split('@')[0]

        sorted_users = []
        username = request.user.username
        current_user_profile = AlibabaProfile.objects.get_profile(username)
        if not current_user_profile:
            # users.query
            users = AlibabaProfile.objects.filter(work_status='A').filter(
                    Q(emp_name__icontains=q) | Q(pinyin_name=q) | Q(work_no=q) |
                    Q(uid__startswith=q) | Q(emp_name_en__icontains=q) |
                    Q(nick_name__icontains=q) | Q(pinyin_nick=q)).order_by('dept_name')[:50]

            sorted_users = sorted(users,
                    key=lambda user: len(user.dept_name.split('-')), reverse=True)
        else:
            users = AlibabaProfile.objects.filter(work_status='A').filter(
                    Q(emp_name__icontains=q) | Q(pinyin_name=q) | Q(work_no=q) |
                    Q(uid__startswith=q) | Q(emp_name_en__icontains=q) |
                    Q(nick_name__icontains=q) | Q(pinyin_nick=q))[:50]

            # current user's dept is "A-B-C-D"
            current_user_dept_name = current_user_profile.dept_name

            # [u'A', u'A-B', u'A-B-C', u'A-B-C-D']
            current_user_dept_name_structure = []
            for idx, val in enumerate(current_user_dept_name.split('-')):
                if idx == 0:
                    current_user_dept_name_structure.append(val)
                else:
                    current_user_dept_name_structure.append(
                            current_user_dept_name_structure[-1] + '-' + val)

            for item in reversed(current_user_dept_name_structure):

                dept_match_list = []
                for user in users:
                    if user in sorted_users:
                        continue

                    user_dept_name = user.dept_name
                    if user_dept_name.startswith(item):
                        dept_match_list.append(user)

                dept_match_list = sorted(dept_match_list,
                        key=lambda user: len(user.dept_name.split('-')))

                sorted_users.extend(dept_match_list)

            dept_unmatch_list = []
            for user in users:
                if user not in sorted_users:
                    dept_unmatch_list.append(user)

            dept_unmatch_list = sorted(dept_unmatch_list,
                    key=lambda user: len(user.dept_name.split('-')))
            sorted_users.extend(dept_unmatch_list)

        result = []
        for user in sorted_users:

            if user.uid == username:
                continue

            user_info = {}
            user_info['uid'] = user.uid
            user_info['personal_photo_url'] = get_alibaba_user_avatar_url(user.uid)
            user_info['emp_name'] = user.emp_name or ''
            user_info['nick_name'] = user.nick_name or ''
            user_info['work_no'] = user.work_no or ''

            if request.LANGUAGE_CODE == 'zh-cn':
                user_info['post_name'] = user.post_name or ''
                user_info['dept_name'] = user.dept_name or ''
            else:
                user_info['post_name'] = user.post_name_en or ''
                user_info['dept_name'] = user.dept_name_en or ''

            result.append(user_info)

        return Response({"users": result})


class AlibabaUserEditFileView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):

        # argument check
        repo_id = request.data.get('repo_id', None)
        path = request.data.get('path', None)
        unique_id = request.data.get('unique_id', None)

        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        path = normalize_file_path(path)

        if not unique_id:
            error_msg = 'unique_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            # if not has repo permisson, then check share link permisson
            share_link_token = request.data.get('share_link_token', None)
            if not share_link_token:
                error_msg = 'permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                share_link = FileShare.objects.get(token=share_link_token)
            except FileShare.DoesNotExist:
                error_msg = 'permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            share_link_repo_id = share_link.repo_id
            share_link_path = normalize_file_path(share_link.path)
            if repo_id != share_link_repo_id or path != share_link_path:
                log_error_info = 'request info (%s, %s) not equal to share link database info (%s, %s)' % \
                        (repo_id, path, share_link_repo_id, share_link_path)
                logger.error(log_error_info)
                error_msg = 'permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # check share link creator's repo permission to current file
            share_link_creator = share_link.username
            if not seafile_api.check_permission_by_path(repo_id, '/', share_link_creator):
                log_error_info = 'share link creator has no permission for (%s, %s)' % (repo_id, path)
                logger.error(log_error_info)
                error_msg = 'permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # add user view/edit file start time info
        username = request.user.username
        try:
            AlibabaUserEditFile.objects.add_start_edit_info(username, repo_id,
                    path, unique_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def put(self, request):

        unique_id = request.data.get('unique_id', None)
        if not unique_id:
            error_msg = 'unique_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        info = AlibabaUserEditFile.objects.get_edit_info_by_unique_id(unique_id)
        if not info:
            error_msg = 'User view/edit file info %s not found.' % unique_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        repo_id = info.repo_id
        path = normalize_file_path(info.path)
        if not check_folder_permission(request, repo_id, '/'):

            share_link_token = request.data.get('share_link_token', None)
            if not share_link_token:
                error_msg = 'permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                share_link = FileShare.objects.get(token=share_link_token)
            except FileShare.DoesNotExist:
                error_msg = 'permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            share_link_repo_id = share_link.repo_id
            share_link_path = normalize_file_path(share_link.path)
            if repo_id != share_link_repo_id or path != share_link_path:
                log_error_info = 'request info (%s, %s) not equal to share link database info (%s, %s)' % \
                        (repo_id, path, share_link_repo_id, share_link_path)
                logger.error(log_error_info)
                error_msg = 'permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # check share link creator's repo permission to current file
            share_link_creator = share_link.username
            if not seafile_api.check_permission_by_path(repo_id, '/', share_link_creator):
                log_error_info = 'share link creator has no permission for (%s, %s)' % (repo_id, path)
                logger.error(log_error_info)
                error_msg = 'permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            AlibabaUserEditFile.objects.complete_end_edit_info(unique_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
