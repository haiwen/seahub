# Copyright (c) 2012-2016 Seafile Ltd.
import os
import json
import logging
from django.core.cache import cache
from django.core.urlresolvers import reverse

from seaserv import ccnet_api, seafile_api
from seahub.notifications.models import Notification
from seahub.notifications.settings import NOTIFICATION_CACHE_TIMEOUT

logger = logging.getLogger(__name__)

def refresh_cache():
    """
    Function to be called when change primary notification.
    """
    cache.set('CUR_TOPINFO', Notification.objects.all().filter(primary=1),
              NOTIFICATION_CACHE_TIMEOUT)


def update_notice_detail(request, notices):
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
                    notice.delete()
                    notice = None
                else:
                    repo_url = reverse('lib_view', args=[repo.id, repo.name, ''])
                    d['repo_name'] = repo.name
                    d['repo_url'] = request.build_absolute_uri(repo_url)
                    notice.detail = json.dumps(d)

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
                    notice.delete()
                    notice = None
                else:
                    repo_url = reverse('lib_view', args=[repo.id, repo.name, ''])
                    group_url = reverse('group', args=[group.id])
                    d['repo_name'] = repo.name
                    d['group_name'] = group.group_name
                    d['repo_url'] = request.build_absolute_uri(repo_url)
                    d['group_url'] = request.build_absolute_uri(group_url)
                    notice.detail = json.dumps(d)

            except Exception as e:
                logger.error(e)

        elif notice.is_add_user_to_group():
            try:
                d = json.loads(notice.detail)
                group_id = d['group_id']
                group_staff = d['group_staff']
                group = ccnet_api.get_group(group_id)
                if group is None:
                    notice.delete()
                    notice = None
                else:
                    d['group_name'] = group.group_name
                    group_href = reverse('group', args=[group_id])
                    user_href = reverse('user_profile', args=[group_staff])
                    d['group_href'] = request.build_absolute_uri(group_href)
                    d['user_href'] = request.build_absolute_uri(user_href)
                    notice.detail = json.dumps(d)
            except Exception as e:
                logger.error(e)

        elif notice.is_draft_comment_msg():
            try:
                d = json.loads(notice.detail)
                draft_id = d['draft_id']
                draft_url = reverse('drafts:draft', args=[draft_id])
                d['draft_url'] = request.build_absolute_uri(draft_url)
                notice.detail = json.dumps(d)
            except Exception as e:
                logger.error(e)

        elif notice.is_repo_transfer_msg():
            try:
                d = json.loads(notice.detail)
                repo_id = d['repo_id']
                repo_name = d['repo_name']
                repo_url = reverse('lib_view', args=[repo_id, repo_name, ''])
                d['repo_url'] = request.build_absolute_uri(repo_url)
                notice.detail = json.dumps(d)
            except Exception as e:
                logger.error(e)

        elif notice.is_draft_reviewer_msg():
            try:
                d = json.loads(notice.detail)
                draft_id = d['draft_id']
                draft_url = reverse('drafts:draft', args=[draft_id])
                d['draft_url'] = request.build_absolute_uri(draft_url)
                notice.detail = json.dumps(d)
            except Exception as e:
                logger.error(e)

        elif notice.is_file_uploaded_msg():
            try:
                d = json.loads(notice.detail)
                filename = d['file_name']
                repo_id = d['repo_id']
                repo = seafile_api.get_repo(repo_id)
                if repo:
                    if d['uploaded_to'] == '/':
                        # current upload path is '/'
                        file_path = '/' + filename
                        link = reverse('lib_view', args=[repo_id, repo.name, ''])
                        name = repo.name
                    else:
                        uploaded_to = d['uploaded_to'].rstrip('/')
                        file_path = uploaded_to + '/' + filename
                        link = reverse('lib_view', args=[repo_id, repo.name, uploaded_to.lstrip('/')])
                        name = os.path.basename(uploaded_to)
                    file_link = reverse('view_lib_file', args=[repo_id, file_path])
                    d['folder_link'] = request.build_absolute_uri(link)
                    d['file_link'] = request.build_absolute_uri(file_link)
                    d['folder_name'] = name
                    d['repo_exist'] = True
                else:
                    d['repo_exist'] = False

                notice.detail = json.dumps(d)

            except Exception as e:
                logger.error(e)

        elif notice.is_file_comment_msg():
            try:
                d = json.loads(notice.detail)

                repo_id = d['repo_id']
                file_path = d['file_path']

                repo = seafile_api.get_repo(repo_id)
                if repo is None or not seafile_api.get_file_id_by_path(repo.id, file_path):
                    notice.delete()
                    notice = None
                else:
                    file_name = os.path.basename(file_path)
                    file_url = reverse('view_lib_file', args=[repo_id, file_path]),
                    d['file_url'] = request.build_absolute_uri(file_url[0])
                    d['file_name'] = file_name
                    notice.detail = json.dumps(d)
            except Exception as e:
                logger.error(e)

    return notices
