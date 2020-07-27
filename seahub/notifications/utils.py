# Copyright (c) 2012-2016 Seafile Ltd.
import os
import json
import logging
from django.core.cache import cache
from django.urls import reverse

from seaserv import ccnet_api, seafile_api
from seahub.notifications.models import Notification
from seahub.notifications.settings import NOTIFICATION_CACHE_TIMEOUT
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email

logger = logging.getLogger(__name__)


def refresh_cache():
    """
    Function to be called when change primary notification.
    """
    cache.set('CUR_TOPINFO', Notification.objects.all().filter(primary=1),
              NOTIFICATION_CACHE_TIMEOUT)


def update_notice_detail(request, notices):
    repo_dict = {}
    for notice in notices:
        if notice.is_repo_share_msg():
            try:
                d = json.loads(notice.detail)
                repo_id = d['repo_id']
                path = d.get('path', '/')
                org_id = d.get('org_id', None)
                if path == '/':
                    repo = seafile_api.get_repo(repo_id)
                else:
                    if org_id:
                        owner = seafile_api.get_org_repo_owner(repo_id)
                        repo = seafile_api.get_org_virtual_repo(
                            org_id, repo_id, path, owner)
                    else:
                        owner = seafile_api.get_repo_owner(repo_id)
                        repo = seafile_api.get_virtual_repo(repo_id, path, owner)

                if repo is None:
                    notice.detail = None
                else:
                    d.pop('org_id', None)
                    share_from_user_email = d.pop('share_from')
                    url, is_default, date_uploaded = api_avatar_url(share_from_user_email, 32)
                    d['repo_name'] = repo.name
                    d['repo_id'] = repo.id
                    d['share_from_user_name'] = email2nickname(share_from_user_email)
                    d['share_from_user_email'] = share_from_user_email
                    d['share_from_user_contact_email'] = email2contact_email(share_from_user_email)
                    d['share_from_user_avatar_url'] = url
                    notice.detail = d

            except Exception as e:
                logger.error(e)

        elif notice.is_repo_share_to_group_msg():
            try:
                d = json.loads(notice.detail)
                group_id = d['group_id']
                path = d.get('path', '/')
                org_id = d.get('org_id', None)
                repo_id = d['repo_id']
                group = ccnet_api.get_group(group_id)
                if path == '/':
                    repo = seafile_api.get_repo(repo_id)
                else:
                    if org_id:
                        owner = seafile_api.get_org_repo_owner(repo_id)
                        repo = seafile_api.get_org_virtual_repo(
                            org_id, repo_id, path, owner)
                    else:
                        owner = seafile_api.get_repo_owner(repo_id)
                        repo = seafile_api.get_virtual_repo(repo_id, path, owner)

                if not repo or not group:
                    notice.detail = None
                else:
                    d.pop('org_id', None)
                    share_from_user_email = d.pop('share_from')
                    url, is_default, date_uploaded = api_avatar_url(share_from_user_email, 32)
                    d['share_from_user_name'] = email2nickname(share_from_user_email)
                    d['share_from_user_email'] = share_from_user_email
                    d['share_from_user_contact_email'] = email2contact_email(share_from_user_email)
                    d['share_from_user_avatar_url'] = url
                    d['repo_name'] = repo.name
                    d['repo_id'] = repo.id
                    d['group_name'] = group.group_name
                    notice.detail = d

            except Exception as e:
                logger.error(e)

        elif notice.is_add_user_to_group():
            try:
                d = json.loads(notice.detail)
                group_id = d['group_id']
                group = ccnet_api.get_group(group_id)
                if group is None:
                    notice.detail = None
                else:
                    group_staff_email = d.pop('group_staff')
                    url, is_default, date_uploaded = api_avatar_url(group_staff_email, 32)
                    d['group_staff_name'] = email2nickname(group_staff_email)
                    d['group_staff_email'] = group_staff_email
                    d['group_staff_contact_email'] = email2contact_email(group_staff_email)
                    d['group_staff_avatar_url'] = url
                    d['group_name'] = group.group_name

                    notice.detail = d
            except Exception as e:
                logger.error(e)

        elif notice.is_draft_comment_msg():
            try:
                d = json.loads(notice.detail)
                author_email = d.pop('author')
                url, is_default, date_uploaded = api_avatar_url(author_email, 32)
                d['author_name'] = email2nickname(author_email)
                d['author_email'] = author_email
                d['author_context_email'] = email2contact_email(author_email)
                d['author_avatar_url'] = url

                notice.detail = d
            except Exception as e:
                logger.error(e)

        elif notice.is_repo_transfer_msg():
            try:
                d = json.loads(notice.detail)
                repo_id = d['repo_id']
                repo = seafile_api.get_repo(repo_id)
                if not repo:
                    notice.detail = None
                else:
                    d.pop('org_id', None)
                    repo_owner_email = d.pop('repo_owner')
                    d['transfer_from_user_name'] = email2nickname(repo_owner_email)
                    d['transfer_from_user_email'] = repo_owner_email
                    d['transfer_from_user_contact_email'] = email2contact_email(repo_owner_email)
                    url, is_default, date_uploaded = api_avatar_url(repo_owner_email, 32)
                    d['transfer_from_user_avatar_url'] = url
                    notice.detail = d

            except Exception as e:
                logger.error(e)

        elif notice.is_draft_reviewer_msg():
            try:
                d = json.loads(notice.detail)
                d.pop('to_user', None)
                request_user_email = d.pop('from_user')
                url, is_default, date_uploaded = api_avatar_url(request_user_email, 32)
                d['request_user_name'] = email2nickname(request_user_email)
                d['request_user_email'] = request_user_email
                d['request_user_contact_email'] = email2contact_email(request_user_email)
                d['request_user_avatat_url'] = url
                notice.detail = d
            except Exception as e:
                logger.error(e)

        elif notice.is_file_uploaded_msg():
            try:
                d = json.loads(notice.detail)
                filename = d['file_name']
                repo_id = d['repo_id']

                if repo_id in repo_dict:
                    repo = repo_dict[repo_id]
                else:
                    repo = seafile_api.get_repo(repo_id)
                    repo_dict[repo_id] = repo

                if repo:
                    if d['uploaded_to'] == '/':
                        # current upload path is '/'
                        file_path = '/' + filename
                        name = repo.name
                    else:
                        uploaded_to = d['uploaded_to'].rstrip('/')
                        file_path = uploaded_to + '/' + filename
                        name = os.path.basename(uploaded_to)

                    d['repo_name'] = repo.name
                    d['folder_path'] = d.pop('uploaded_to')
                    d['folder_name'] = name
                    d['file_path'] = file_path
                    url, is_default, date_uploaded = api_avatar_url('', 32)
                    d['uploaded_user_avatar_url'] = url
                    notice.detail = d
                else:
                    notice.detail = None

            except Exception as e:
                logger.error(e)

        elif notice.is_file_comment_msg():
            try:
                d = json.loads(notice.detail)

                repo_id = d['repo_id']
                file_path = d['file_path']

                if repo_id in repo_dict:
                    repo = repo_dict[repo_id]
                else:
                    repo = seafile_api.get_repo(repo_id)
                    repo_dict[repo_id] = repo

                if repo is None or not seafile_api.get_file_id_by_path(repo.id, file_path):
                    notice.detail = None
                else:
                    author_email = d.pop('author')
                    file_name = os.path.basename(file_path)
                    url, is_default, date_uploaded = api_avatar_url(author_email, 32)
                    d['author_avatar_url'] = url
                    d['author_name'] = email2nickname(author_email)
                    d['author_email'] = author_email
                    d['author_contact_email'] = email2contact_email(author_email)
                    d['file_name'] = file_name
                    notice.detail = d
            except Exception as e:
                logger.error(e)

    return notices
