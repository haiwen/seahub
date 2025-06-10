# Copyright (c) 2012-2016 Seafile Ltd.

import os
import json
import logging
import posixpath
import datetime
import uuid
import re
import requests
from zipfile import ZipFile
import shutil
from pathlib import Path
from copy import deepcopy
from constance import config
from urllib.parse import quote
from bs4 import BeautifulSoup

from html_to_markdown import convert_to_markdown
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api
from pysearpc import SearpcError
from django.utils.translation import gettext as _
from django.http import HttpResponse, HttpResponseRedirect
from django.urls import reverse

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import sdoc_export_to_md
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, is_wiki_repo

from seahub.utils.db_api import SeafileDB
from seahub.wiki2.models import Wiki2 as Wiki
from seahub.wiki.models import Wiki as OldWiki
from seahub.wiki2.models import WikiPageTrash, Wiki2Publish
from seahub.wiki2.utils import is_valid_wiki_name, get_wiki_config, WIKI_PAGES_DIR, is_group_wiki, \
    check_wiki_admin_permission, check_wiki_permission, get_all_wiki_ids, get_and_gen_page_nav_by_id, \
    get_current_level_page_ids, save_wiki_config, gen_unique_id, gen_new_page_nav_by_id, pop_nav, \
    delete_page, move_nav, revert_nav, get_sub_ids_by_page_id, get_parent_id_stack, add_convert_wiki_task

from seahub.utils import is_org_context, get_user_repos, is_pro_version, is_valid_dirent_name, \
    get_no_duplicate_obj_name, HAS_FILE_SEARCH, HAS_FILE_SEASEARCH, gen_file_get_url, get_service_url, \
    gen_file_upload_url, PREVIEW_FILEEXT
if HAS_FILE_SEARCH or HAS_FILE_SEASEARCH:
    from seahub.search.utils import search_wikis, ai_search_wikis

from seahub.views import check_folder_permission
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.file_op import check_file_lock
from seahub.utils.repo import get_repo_owner, is_valid_repo_id_format, is_group_repo_staff, is_repo_owner
from seahub.seadoc.utils import get_seadoc_file_uuid, gen_seadoc_access_token, copy_sdoc_images_with_sdoc_uuid
from seahub.settings import ENABLE_STORAGE_CLASSES, STORAGE_CLASS_MAPPING_POLICY, \
    ENCRYPTED_LIBRARY_VERSION, SERVICE_URL
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils.ccnet_db import CcnetDB
from seahub.tags.models import FileUUIDMap
from seahub.seadoc.models import SeadocHistoryName, SeadocCommentReply
from seahub.base.models import FileComment
from seahub.api2.views import HTTP_447_TOO_MANY_FILES_IN_LIBRARY
from seahub.group.utils import group_id_to_name, is_group_admin
from seahub.utils.rpc import SeafileAPI
from seahub.constants import PERMISSION_READ_WRITE
from seaserv import ccnet_api
from seahub.share.utils import is_repo_admin
from seahub.api2.endpoints.utils import md_to_sdoc


HTTP_520_OPERATION_FAILED = 520
WIKI_PAGE_EXPORT_TYPES = ['sdoc', 'markdown']

logger = logging.getLogger(__name__)


def _merge_wiki_in_groups(group_wikis, publish_wikis_dict, link_prefix):

    group_ids = [gw.group_id for gw in group_wikis]
    group_id_wikis_map = {key: [] for key in group_ids}
    for gw in group_wikis:
        wiki = Wiki(gw)
        wiki_info = wiki.to_dict()
        owner = gw.owner
        if ('@seafile_group') in owner:
            group_id = int(owner.split('@')[0])
            owner_nickname = group_id_to_name(group_id)
        else:
            owner_nickname = email2nickname(owner)
        is_published = True if publish_wikis_dict.get(gw.id) else False
        public_url_suffix = publish_wikis_dict.get(gw.id) if is_published else ""
        link = link_prefix + public_url_suffix if public_url_suffix else ""
        repo_info = {
                "type": "group",
                "permission": gw.permission,
                "owner_nickname": owner_nickname,
                "public_url_suffix": public_url_suffix,
                "public_url": link,
                "is_published": is_published
        }
        wiki_info.update(repo_info)
        group_id = gw.group_id
        group_id_wikis_map[group_id].append(wiki_info)
    return group_id_wikis_map




class Wikis2View(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        """List all wikis.
        """
        username = request.user.username
        org_id = request.user.org.org_id if is_org_context(request) else None
        (owned, shared, groups, public) = get_user_repos(username, org_id)

        # list user groups
        if is_org_context(request):
            org_id = request.user.org.org_id
            user_groups = ccnet_api.get_org_groups_by_user(org_id, username, return_ancestors=True)
        else:
            user_groups = ccnet_api.get_groups(username, return_ancestors=True)
        owned_wikis = [r for r in owned if is_wiki_repo(r)]
        shared_wikis = [r for r in shared if is_wiki_repo(r)]
        group_wikis = [r for r in groups if is_wiki_repo(r)]
        wiki_ids = [w.repo_id for w in owned_wikis + shared_wikis + group_wikis]
        link_prefix = get_service_url().rstrip('/') + '/wiki/publish/'
        publish_wikis_dict = {}
        published_wikis = Wiki2Publish.objects.filter(repo_id__in=wiki_ids)
        for w in published_wikis:
            publish_wikis_dict[w.repo_id] = w.publish_url
        wiki_list = []
        for r in owned_wikis:
            r.owner = username
            r.permission = 'rw'
            wiki = Wiki(r)
            wiki_info = wiki.to_dict()
            is_published = True if publish_wikis_dict.get(r.id) else False
            public_url_suffix = publish_wikis_dict.get(r.id) if is_published else ""
            link = link_prefix + public_url_suffix if public_url_suffix else ""
            repo_info = {
                    "type": "mine",
                    "permission": 'rw',
                    "owner_nickname": email2nickname(username),
                    "public_url_suffix": public_url_suffix,
                    "public_url": link,
                    "is_published": is_published
                }
            wiki_info.update(repo_info)
            wiki_list.append(wiki_info)

        for r in shared_wikis:
            owner = r.user
            r.owner = owner
            wiki = Wiki(r)
            if ('@seafile_group') in r.owner:
                group_id = int(owner.split('@')[0])
                owner_nickname = group_id_to_name(group_id)
            else:
                owner_nickname = email2nickname(owner)
            wiki_info = wiki.to_dict()
            is_published = True if publish_wikis_dict.get(r.id) else False
            public_url_suffix = publish_wikis_dict.get(r.id) if is_published else ""
            link = link_prefix + public_url_suffix if public_url_suffix else ""
            repo_info = {
                    "type": "shared",
                    "permission": r.permission,
                    "owner_nickname": owner_nickname,
                    "public_url_suffix": public_url_suffix,
                    "public_url": link,
                    "is_published": is_published
                }
            wiki_info.update(repo_info)
            wiki_list.append(wiki_info)

        group_id_in_wikis = list(set([r.group_id for r in group_wikis]))
        try:
            group_ids_admins_map = {}
            if group_id_in_wikis:
                ccnet_db = CcnetDB()
                group_ids_admins_map = ccnet_db.get_group_ids_admins_map(group_id_in_wikis)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        user_wiki_groups = [ug for ug in user_groups if ug.id in group_id_in_wikis]
        for r in group_wikis:
            r.owner = r.user

        group_wiki_list = []
        group_id_wikis_map = _merge_wiki_in_groups(group_wikis, publish_wikis_dict, link_prefix)
        for group_obj in user_wiki_groups:
            group_wiki = {
                'group_name': group_obj.group_name,
                'group_id': group_obj.id,
                'group_admins': group_ids_admins_map.get(group_obj.id) or [],
                "owner": group_obj.creator_name,
                'wiki_info': group_id_wikis_map[group_obj.id]
            }
            group_wiki_list.append(group_wiki)
        wiki_list = sorted(wiki_list, key=lambda x: x.get('updated_at'), reverse=True)

        return Response({'wikis': wiki_list, 'group_wikis': group_wiki_list})

    def post(self, request, format=None):
        """Add a new wiki.
        """
        username = request.user.username

        if not request.user.permissions.can_add_repo():
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to create library.')

        if not request.user.permissions.can_create_wiki():
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to create wiki.')

        wiki_name = request.data.get("name", None)
        if not wiki_name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'wiki name is required.')

        if not is_valid_wiki_name(wiki_name):
            msg = _('Name can only contain letters, numbers, blank, hyphen or underscore.')
            return api_error(status.HTTP_400_BAD_REQUEST, msg)

        wiki_owner = request.data.get('owner', 'me')

        is_group_owner = False
        group_id = ''
        if wiki_owner == 'me':
            wiki_owner = request.user.username
        else:
            try:
                group_id = int(wiki_owner)
                wiki_owner = "%s@seafile_group" % group_id
            except:
                return api_error(status.HTTP_400_BAD_REQUEST, 'wiki_owner invalid')
            is_group_owner = True

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        permission = PERMISSION_READ_WRITE
        if is_group_owner:
            group_id = int(group_id)
            # only group admin can create wiki
            if not is_group_admin(group_id, request.user.username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            group_quota = seafile_api.get_group_quota(group_id)
            group_quota = int(group_quota)
            if group_quota <= 0 and group_quota != -2:
                error_msg = 'No group quota.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # create group owned repo
            group_id = int(group_id)
            password = None
            if is_pro_version() and ENABLE_STORAGE_CLASSES:

                if STORAGE_CLASS_MAPPING_POLICY in ('USER_SELECT', 'ROLE_BASED'):
                    storage_id = None
                    repo_id = seafile_api.add_group_owned_repo(group_id,
                                                               wiki_name,
                                                               permission,
                                                               password,
                                                               enc_version=ENCRYPTED_LIBRARY_VERSION,
                                                               storage_id=storage_id)
                else:
                    # STORAGE_CLASS_MAPPING_POLICY == 'REPO_ID_MAPPING'
                    repo_id = SeafileAPI.add_group_owned_repo(
                        group_id, wiki_name, password, permission, org_id=org_id)
            else:
                repo_id = SeafileAPI.add_group_owned_repo(
                    group_id, wiki_name, password, permission, org_id=org_id)
        else:
            if org_id and org_id > 0:
                repo_id = seafile_api.create_org_repo(wiki_name, '', username, org_id)
            else:
                repo_id = seafile_api.create_repo(wiki_name, '', username)

        try:
            seafile_db_api = SeafileDB()
            seafile_db_api.set_repo_type(repo_id, 'wiki')
        except Exception as e:
            logger.error(e)
            msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, msg)

        repo = seafile_api.get_repo(repo_id)
        wiki = Wiki(repo, wiki_owner)
        wiki_info = wiki.to_dict()
        if not is_group_owner:
            wiki_info['owner_nickname'] = email2nickname(wiki.owner)
        else:
            group_id = int(wiki.owner.split('@')[0])
            try:
                ccnet_db = CcnetDB()
                group_ids_admins_map = ccnet_db.get_group_ids_admins_map([group_id])
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            wiki_info['owner_nickname'] = group_id_to_name(group_id)
            wiki_info['group_admins'] = group_ids_admins_map[group_id]

        return Response(wiki_info)


class Wiki2View(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, wiki_id):
        wiki_name = request.data.get('wiki_name')
        if not wiki_name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'wiki name is required.')

        if not is_valid_dirent_name(wiki_name):
            return api_error(status.HTTP_400_BAD_REQUEST, 'name invalid.')

        username = request.user.username

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = 'Wiki not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if wiki_name == wiki.name:
            return Response({"success": True})

        repo_id = wiki.repo_id
        repo = seafile_api.get_repo(repo_id)

        if not repo:
            error_msg = "Wiki library not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        if not check_wiki_admin_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not is_group_wiki(wiki):
            is_owner = True if username == repo_owner else False
            if not is_owner:
                return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

            # check repo status
            repo_status = repo.status
            if repo_status != 0:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            seafile_api.edit_repo(repo_id, wiki_name, '', username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True})

    def delete(self, request, wiki_id):
        """Delete a wiki.
        """
        username = request.user.username

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = 'Wiki not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        if not check_wiki_admin_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        if is_group_wiki(wiki):
            group_id = int(wiki.owner.split('@')[0])
            try:
                SeafileAPI.delete_group_owned_repo(group_id, wiki.repo_id, org_id)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        else:
            seafile_api.remove_repo(wiki.repo_id)

        Wiki2Publish.objects.filter(repo_id=wiki.repo_id).delete()

        return Response()


class Wiki2ConfigView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, wiki_id):
        """Edit a wiki config
        """
        wiki_config = request.data.get('wiki_config')
        if not wiki_config:
            error_msg = 'wiki_config invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        username = request.user.username
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        wiki_perm = check_wiki_permission(wiki, request.user.username)
        if wiki_perm == 'r':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # save config
        try:
            save_wiki_config(wiki, username, wiki_config)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        wiki = wiki.to_dict()
        wiki['wiki_config'] = wiki_config
        return Response({'wiki': wiki})

    def get(self, request, wiki_id):


        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        if not check_wiki_permission(wiki, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = _("Internal Server Error")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        wiki = wiki.to_dict()
        wiki_config = get_wiki_config(repo.repo_id, request.user.username)

        wiki['wiki_config'] = wiki_config

        return Response({'wiki': wiki})


class Wiki2PublishConfigView(APIView):
    throttle_classes = (UserRateThrottle,)

    def get(self, request, wiki_id):
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        if not Wiki2Publish.objects.filter(repo_id=wiki.repo_id).exists():
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = _("Internal Server Error")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        wiki = wiki.to_dict()
        wiki_config = get_wiki_config(repo.repo_id, '')

        wiki['wiki_config'] = wiki_config

        return Response({'wiki': wiki})


class Wiki2PagesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get_file_info(self, repo_id, file_path):

        file_obj = seafile_api.get_dirent_by_path(repo_id, file_path)
        if file_obj:
            file_name = file_obj.obj_name
        else:
            file_name = os.path.basename(file_path.rstrip('/'))

        file_info = {
            'repo_id': repo_id,
            'parent_dir': os.path.dirname(file_path),
            'obj_name': file_name,
            'locked': False,
            'mtime': timestamp_to_isoformat_timestr(file_obj.mtime) if file_obj else ''
        }

        return file_info

    def post(self, request, wiki_id):
        page_name = request.data.get('page_name', None)

        if not page_name or '/' in page_name or '\\' in page_name:
            error_msg = 'page_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        current_id = request.data.get('current_id', None)
        insert_position = request.data.get('insert_position', None)
        positions = ['above', 'below', 'inner']
        if insert_position and insert_position not in positions:
            error_msg = 'insert_position invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        wiki_perm = check_wiki_permission(wiki, request.user.username)
        if wiki_perm == 'r':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki.repo_id
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki_config = get_wiki_config(repo_id, request.user.username)
        navigation = wiki_config.get('navigation', [])
        # side panel create Untitled page
        if not current_id:
            page_ids = {element.get('id') for element in navigation if element.get('type') != 'folder'}
        else:
            page_ids = []
            get_current_level_page_ids(navigation, current_id, page_ids)
        pages = wiki_config.get('pages', [])
        exist_page_names = [page.get('name') for page in pages if page.get('id') in page_ids]
        page_name = get_no_duplicate_obj_name(page_name, exist_page_names)

        sdoc_uuid = uuid.uuid4()
        new_file_name = page_name + '.sdoc'
        parent_dir = os.path.join(WIKI_PAGES_DIR, str(sdoc_uuid))
        path = os.path.join(parent_dir, new_file_name)
        new_file_path = posixpath.join(parent_dir, new_file_name)
        file_info = self.get_file_info(repo_id, new_file_path)
        file_info['doc_uuid'] = sdoc_uuid
        file_info['page_name'] = page_name
        filename = os.path.basename(path)

        try:
            FileUUIDMap.objects.create_fileuuidmap_by_uuid(sdoc_uuid, repo_id, parent_dir, filename, is_dir=False)
            # update wiki_config
            id_set = get_all_wiki_ids(navigation)
            new_page_id = gen_unique_id(id_set)
            file_info['page_id'] = new_page_id
            is_find = [False]
            gen_new_page_nav_by_id(navigation, new_page_id, current_id, insert_position, is_find)
            if not is_find[0]:
                error_msg = 'Current page does not exist'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
            # create new empty file
            seafile_api.mkdir_with_parents(repo_id, '/', parent_dir.strip('/'), request.user.username)
            if not is_valid_dirent_name(new_file_name):
                return api_error(status.HTTP_400_BAD_REQUEST, 'name invalid.')

            try:
                seafile_api.post_empty_file(repo_id, parent_dir, new_file_name, request.user.username)
            except Exception as e:
                if str(e) == 'Too many files in library.':
                    error_msg = _("The number of files in library exceeds the limit")
                    return api_error(HTTP_447_TOO_MANY_FILES_IN_LIBRARY, error_msg)
                else:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            new_page = {
                'id': new_page_id,
                'name': page_name,
                'path': path,
                'icon': '',
                'docUuid': str(sdoc_uuid),
                'locked': False
            }
            pages.append(new_page)

            if len(wiki_config) == 0:
                wiki_config['version'] = 1

            wiki_config['navigation'] = navigation
            wiki_config['pages'] = pages
            wiki_config = json.dumps(wiki_config)
            save_wiki_config(wiki, request.user.username, wiki_config)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        wiki = wiki.to_dict()
        wiki['wiki_config'] = wiki_config

        return Response({'file_info': file_info})

    def put(self, request, wiki_id):

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        if not check_wiki_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki_config = get_wiki_config(repo_id, username)
        navigation = wiki_config.get('navigation', [])

        id_set = get_all_wiki_ids(navigation)
        target_page_id = request.data.get('target_id', '')
        moved_page_id = request.data.get('moved_id', '')
        move_position = request.data.get('move_position', '')
        # check arguments
        valid_move_positions = ['move_below', 'move_above', 'move_into']
        if move_position not in valid_move_positions:
            error_msg = 'Invalid move_position value: ' + move_position
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if (target_page_id not in id_set) or (moved_page_id not in id_set):
            error_msg = 'Page not found'
            logger.error(error_msg)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        moved_nav = pop_nav(navigation, moved_page_id)
        # Move one into one's own subset
        judge_navs = get_all_wiki_ids([moved_nav])
        if target_page_id in judge_navs:
            error_msg = 'Internal Server Error'
            logger.error(error_msg)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        move_nav(navigation, target_page_id, moved_nav, move_position)
        wiki_config['navigation'] = navigation
        wiki_config = json.dumps(wiki_config)

        try:
            save_wiki_config(wiki, username, wiki_config)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return Response({'success': True})


class Wiki2PageView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, wiki_id, page_id):
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        if not check_wiki_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki_config = get_wiki_config(repo_id, username)
        pages = wiki_config.get('pages', [])
        page_info = next(filter(lambda t: t['id'] == page_id, pages), {})
        path = page_info.get('path')
        doc_uuid = page_info.get('docUuid')

        if not page_info:
            error_msg = 'page %s not found.' % page_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, wiki.repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo.repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get file id by path.")
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        filename = os.path.basename(path)
        try:
            dirent = seafile_api.get_dirent_by_path(repo.repo_id, path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
            else:
                latest_contributor, last_modified = None, 0
        except SearpcError as e:
            logger.error(e)
            latest_contributor, last_modified = None, 0

        assets_url = '/api/v2.1/seadoc/download-image/' + doc_uuid
        seadoc_access_token = gen_seadoc_access_token(doc_uuid, filename, request.user.username, permission=permission, default_title='')

        return Response({
            "latest_contributor": email2nickname(latest_contributor),
            "last_modified": last_modified,
            "permission": permission,
            "seadoc_access_token": seadoc_access_token,
            "assets_url": assets_url,
        })

    def delete(self, request, wiki_id, page_id):

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        if not check_wiki_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki_config = get_wiki_config(repo_id, username)
        pages = wiki_config.get('pages', [])
        page_info = next(filter(lambda t: t['id'] == page_id, pages), {})
        if not page_info:
            error_msg = 'page %s not found.' % page_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check file lock
        try:
            path = page_info.get('path')
            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if is_locked and not locked_by_me:
            error_msg = _("File is locked")
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check page
        navigation = wiki_config.get('navigation', [])
        id_set = get_all_wiki_ids(navigation)
        if page_id not in id_set:
            error_msg = 'Page not found'
            logger.error(error_msg)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # update navigation and page
        stack_ids = get_parent_id_stack(navigation, page_id)
        parent_page_id = stack_ids.pop() if stack_ids else None
        subpages = pop_nav(navigation, page_id)
        # delete the folder where the sdoc is located
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, page_info['path'])
            page_size = seafile_api.get_file_size(repo.store_id, repo.version, file_id)
            doc_uuid = os.path.basename(os.path.dirname(page_info['path']))
            WikiPageTrash.objects.create(repo_id=repo_id,
                                         doc_uuid=doc_uuid,
                                         page_id=page_info['id'],
                                         parent_page_id=parent_page_id,
                                         subpages=json.dumps(subpages),
                                         name=page_info['name'],
                                         delete_time=datetime.datetime.utcnow(),
                                         size=page_size)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # update wiki_config
        try:
            wiki_config['navigation'] = navigation
            wiki_config = json.dumps(wiki_config)
            save_wiki_config(wiki, request.user.username, wiki_config)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return Response({'success': True})

    def put(self, request, wiki_id, page_id):
        if not is_pro_version():
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        if not check_wiki_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        locked = request.data.get('is_lock_page', None)
        if locked is None:
            error_msg = 'locked is required.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        wiki_config = get_wiki_config(repo_id, username)
        pages = wiki_config.get('pages', [])
        page_exists = False
        for page in pages:
            if page['id'] == page_id:
                page['locked'] = locked
                path = page['path']
                page_exists = True
                break
        if not page_exists:
            error_msg = 'page %s not found.' % page_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki_config['pages'] = pages
        wiki_config = json.dumps(wiki_config)
        save_wiki_config(wiki, username, wiki_config)

        expire = request.data.get('expire', -1)
        try:
            expire = int(expire)
        except ValueError:
            error_msg = 'expire invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        is_locked = seafile_api.check_file_lock(repo_id, path.lstrip('/'), '')
        if is_locked == locked:
            return Response({'is_locked': locked}, status=status.HTTP_200_OK)
        if locked:
            try:
                seafile_api.lock_file(repo_id, path.lstrip('/'), username, expire)
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        else:
            # unlock file
            try:
                seafile_api.unlock_file(repo_id, path.lstrip('/'))
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        return Response({'is_locked': locked}, status=status.HTTP_200_OK)


class Wiki2PublishPageView(APIView):
    throttle_classes = (UserRateThrottle,)

    def get(self, request, wiki_id, page_id):

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = wiki.repo_id
        if not Wiki2Publish.objects.filter(repo_id=repo_id).exists():
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki_config = get_wiki_config(repo_id, "")
        pages = wiki_config.get('pages', [])
        page_info = next(filter(lambda t: t['id'] == page_id, pages), {})
        path = page_info.get('path')
        doc_uuid = page_info.get('docUuid')

        if not page_info:
            error_msg = 'page %s not found.' % page_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo.repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get file id by path.")
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        filename = os.path.basename(path)
        try:
            dirent = seafile_api.get_dirent_by_path(repo.repo_id, path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
            else:
                latest_contributor, last_modified = None, 0
        except SearpcError as e:
            logger.error(e)
            latest_contributor, last_modified = None, 0

        assets_url = '/api/v2.1/seadoc/download-image/' + doc_uuid
        seadoc_access_token = gen_seadoc_access_token(doc_uuid, filename, request.user.username, permission='r',
                                                      default_title='')

        return Response({
            "latest_contributor": email2nickname(latest_contributor),
            "last_modified": last_modified,
            "permission": 'r',
            "seadoc_access_token": seadoc_access_token,
            "assets_url": assets_url,
        })

class Wiki2DuplicatePageView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request, wiki_id):
        page_id = request.data.get('page_id', None)

        if not page_id:
            error_msg = 'page_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)


        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        if not check_wiki_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki.repo_id

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki_config = get_wiki_config(repo_id, username)
        navigation = wiki_config.get('navigation', [])
        pages = wiki_config.get('pages', [])

        page_ids = []
        get_current_level_page_ids(navigation, page_id, page_ids)

        current_exist_page_names = [page.get('name') for page in pages if page.get('id') in page_ids]
        id_set = get_all_wiki_ids(navigation)  # get all id for generate different page id

        # old page to new page
        old_to_new = {}
        get_and_gen_page_nav_by_id(id_set, navigation, page_id, old_to_new)
        # page_id not exist in wiki
        if not old_to_new:
            error_msg = 'page %s not found.' % page_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        src_repo_id = repo_id
        dst_repo_id = repo_id
        new_pages = deepcopy(pages)
        for page in pages:
            src_dirents = []
            dst_dirents = []
            old_page_id = page.get('id')
            new_page_id = old_to_new.get(old_page_id)
            if not new_page_id:
                continue

            page_name = page.get('name')

            # An UUID object will be generated
            # Please set it to string by str if you use it in json or some other string operations
            dst_sdoc_uuid = uuid.uuid4()

            src_path = page.get('path')
            src_file_name = os.path.basename(src_path)

            new_file_name = src_file_name
            parent_dir = os.path.join(WIKI_PAGES_DIR, str(dst_sdoc_uuid))
            path = os.path.join(parent_dir, new_file_name)
            seafile_api.mkdir_with_parents(repo_id, '/', parent_dir.strip('/'), request.user.username)

            new_page_name = page_name
            if old_page_id == page_id:
                # only need rename current level page name
                new_page_name = get_no_duplicate_obj_name(page_name, current_exist_page_names)

            new_page = {
              'id': new_page_id,
              'name': new_page_name,
              'path': path,
              'icon': '',
              'docUuid': str(dst_sdoc_uuid)
            }
            new_pages.append(new_page)

            src_dirent = src_file_name
            dst_dirent = src_dirent
            src_dirents.append(src_dirent)
            dst_dirents.append(dst_dirent)

            src_doc_uuid = page.get('docUuid')
            src_parent_dir = os.path.join(WIKI_PAGES_DIR, str(src_doc_uuid))
            dst_parent_dir = parent_dir

            seafile_api.copy_file(src_repo_id,
                                  src_parent_dir,
                                  json.dumps(src_dirents),
                                  dst_repo_id,
                                  dst_parent_dir,
                                  json.dumps(dst_dirents),
                                  username=username,
                                  need_progress=1,
                                  synchronous=0
                                  )

            FileUUIDMap.objects.create_fileuuidmap_by_uuid(dst_sdoc_uuid, dst_repo_id, parent_dir, dst_dirent, is_dir=False)
            copy_sdoc_images_with_sdoc_uuid(src_repo_id, src_doc_uuid, dst_repo_id, str(dst_sdoc_uuid), username, is_async=True)

        wiki_config['pages'] = new_pages
        wiki_config = json.dumps(wiki_config)

        # save config
        try:
            save_wiki_config(wiki, username, wiki_config)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'wiki_config': wiki_config})


class WikiPageTrashView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, wiki_id):
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check argument
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100
        start = (current_page - 1) * per_page
        end = per_page + start

        # check permission
        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner
        username = request.user.username
        if not check_wiki_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check resource
        repo_id = wiki.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        trash_pages = WikiPageTrash.objects.filter(repo_id=repo_id).order_by('-delete_time')
        total_count = trash_pages.count()
        trash_pages = trash_pages[start: end]
        items = []
        for item in trash_pages:
            items.append(item.to_dict())

        return Response({'items': items, 'total_count': total_count})

    def put(self, request, wiki_id):
        """revert page"""
        page_id = request.data.get('page_id', None)
        if not page_id:
            error_msg = "Page not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner
        username = request.user.username
        if not check_wiki_admin_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # update wiki config
        wiki_config = get_wiki_config(repo_id, username)
        navigation = wiki_config.get('navigation', [])
        try:
            page = WikiPageTrash.objects.get(page_id=page_id)
            subpages = json.loads(page.subpages)
            parent_page_id = page.parent_page_id
            revert_nav(navigation, parent_page_id, subpages)
            page.delete()
            wiki_config = json.dumps(wiki_config)
            save_wiki_config(wiki, username, wiki_config)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request, wiki_id):
        """Clean Wiki Trash
        Permission checking:
        1. wiki owner can perform this action.
        2. is group admin."""

        # argument check
        try:
            keep_days = int(request.data.get('keep_days', 0))
        except ValueError:
            error_msg = 'keep_days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # resource check
        repo_id = wiki.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        repo_owner = get_repo_owner(request, repo_id)
        wiki.owner = repo_owner
        if not config.ENABLE_USER_CLEAN_TRASH:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not check_wiki_admin_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki_config = get_wiki_config(repo_id, username)
        _timestamp = datetime.datetime.now() - datetime.timedelta(days=keep_days)
        del_pages = WikiPageTrash.objects.filter(repo_id=repo_id, delete_time__lt=_timestamp)

        navigation = wiki_config.get('navigation', [])
        pages = wiki_config.get('pages', [])
        id_list = []
        for del_page in del_pages:
            get_sub_ids_by_page_id([(json.loads(del_page.subpages))], id_list)
        id_set = set(id_list)
        clean_pages, not_del_pages = delete_page(pages, id_set)
        try:
            file_uuids = []
            for del_page in clean_pages:
                # rm dir
                sdoc_dir_path = os.path.dirname(del_page['path'])
                parent_dir = os.path.dirname(sdoc_dir_path)
                dir_name = os.path.basename(sdoc_dir_path)
                seafile_api.del_file(repo_id, parent_dir,
                                     json.dumps([dir_name]), username)

                # rm sdoc fileuuid
                file_uuid = get_seadoc_file_uuid(repo, del_page['path'])
                file_uuids.append(file_uuid)
            FileComment.objects.filter(uuid__in=file_uuids).delete()
            FileUUIDMap.objects.filter(uuid__in=file_uuids).delete()
            SeadocHistoryName.objects.filter(doc_uuid__in=file_uuids).delete()
            SeadocCommentReply.objects.filter(doc_uuid__in=file_uuids).delete()
        except Exception as e:
            logger.error(e)

        try:
            seafile_api.clean_up_repo_history(repo_id, 0)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # update wiki_config
        try:
            del_pages.delete()
            wiki_config['navigation'] = navigation
            wiki_config['pages'] = not_del_pages
            wiki_config = json.dumps(wiki_config)
            save_wiki_config(wiki, username, wiki_config)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

class Wiki2PublishView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)
    def _check_custom_url(self, publish_url):

        return True if re.search(r'^[-0-9a-zA-Z]+$', publish_url) else False

    def get(self, request, wiki_id):
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        username = request.user.username
        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner
        if not check_wiki_admin_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            publish_config = Wiki2Publish.objects.get(repo_id=wiki.repo_id)
            publish_url = publish_config.publish_url
            creator = publish_config.username
            created_at = publish_config.created_at
            visit_count = publish_config.visit_count
        except Wiki2Publish.DoesNotExist:
            publish_url = ''
            creator = ''
            created_at = ''
            visit_count = 0
        publish_info = {
            'publish_url': publish_url,
            'creator': creator,
            'created_at': created_at,
            'visit_count': visit_count
        }
        return Response(publish_info)

    def post(self, request, wiki_id):
        publish_url = request.data.get('publish_url', None)
        if not publish_url:
            error_msg = 'wiki custom url invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        publish_url = publish_url.strip()
        if not self._check_custom_url(publish_url):
            error_msg = _('URL is invalid')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if len(publish_url) < 5 or len(publish_url) > 30:
            error_msg = _('The custom part of URL should have 5-30 characters.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not request.user.permissions.can_publish_wiki():
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check permission
        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner
        username = request.user.username
        if not check_wiki_admin_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        wiki_pub = Wiki2Publish.objects.filter(publish_url=publish_url).first()
        if wiki_pub:
            if wiki_pub.repo_id != wiki_id:
                error_msg = _('This custom domain is already in use and cannot be used for your wiki')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            return Response({"publish_url": publish_url})

        wiki_publish = Wiki2Publish.objects.filter(repo_id=wiki.repo_id).first()
        if not wiki_publish:
            wiki_publish = Wiki2Publish(repo_id=wiki.repo_id, username=username, publish_url=publish_url)
        else:
            wiki_publish.publish_url = publish_url
        wiki_publish.save()

        return Response({"publish_url": publish_url})

    def delete(self, request, wiki_id):
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner
        username = request.user.username
        if not check_wiki_admin_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        publish_config = Wiki2Publish.objects.filter(repo_id=wiki.repo_id).first()
        if publish_config:
            publish_config.delete()
        return Response({'success': True})


class WikiSearch(APIView):
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        if not HAS_FILE_SEARCH and not HAS_FILE_SEASEARCH:
            error_msg = 'Search not supported.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        query = request.data.get('query')
        search_wiki = request.data.get('search_wiki')

        try:
            count = int(request.data.get('count'))
        except:
            count = 20

        if not query:
            return api_error(status.HTTP_400_BAD_REQUEST, 'wiki search query invalid')

        if not is_valid_repo_id_format(search_wiki):
            error_msg = 'search_wiki invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        wiki_publish = Wiki2Publish.objects.filter(repo_id=search_wiki).first()
        if not wiki_publish and not request.user.is_authenticated:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        params = {
            'query': query,
            'wiki': search_wiki,
            'count': count,
        }
        if HAS_FILE_SEARCH:
            try:
                results = search_wikis(search_wiki, query, count)
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
            return Response({"results": results})
        elif HAS_FILE_SEASEARCH:
            try:
                results, total = ai_search_wikis(params)
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
            return Response({"results": results})


class WikiConvertView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        old_wiki_id = request.data.get('old_wiki_id', None)
        if not old_wiki_id:
            error_msg = 'old_wiki_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            wiki = OldWiki.objects.get(id=old_wiki_id)
        except OldWiki.DoesNotExist:
            error_msg = 'Old Wiki not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        old_repo_id = wiki.repo_id

        # check old wiki permission
        is_owner = is_repo_owner(request, old_repo_id, username)
        if not is_owner:
            repo_admin = is_repo_admin(username, old_repo_id)
            if not repo_admin:
                is_group_repo_admin = is_group_repo_staff(request, old_repo_id, username)

                if not is_group_repo_admin:
                    error_msg = _('Permission denied.')
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if wiki.username != username:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.permissions.can_add_repo():
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to create library.')

        wiki_name = request.data.get("name", None)
        if not wiki_name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'wiki name is required.')

        if not is_valid_wiki_name(wiki_name):
            msg = _('Name can only contain letters, numbers, blank, hyphen or underscore.')
            return api_error(status.HTTP_400_BAD_REQUEST, msg)

        old_repo_id = wiki.repo_id
        repo = seafile_api.get_repo(old_repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % old_repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki_owner = request.data.get('owner', 'me')
        is_group_owner = False
        group_id = ''
        if wiki_owner == 'me':
            wiki_owner = request.user.username
        else:
            try:
                group_id = int(wiki_owner)
                wiki_owner = "%s@seafile_group" % group_id
            except:
                return api_error(status.HTTP_400_BAD_REQUEST, 'wiki_owner invalid')
            is_group_owner = True

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        permission = PERMISSION_READ_WRITE
        if is_group_owner:
            group_id = int(group_id)
            # only group admin can create wiki
            if not is_group_admin(group_id, request.user.username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            group_quota = seafile_api.get_group_quota(group_id)
            group_quota = int(group_quota)
            if group_quota <= 0 and group_quota != -2:
                error_msg = 'No group quota.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # create group owned repo
            group_id = int(group_id)
            password = None
            if is_pro_version() and ENABLE_STORAGE_CLASSES:

                if STORAGE_CLASS_MAPPING_POLICY in ('USER_SELECT', 'ROLE_BASED'):
                    storage_id = None
                    repo_id = seafile_api.add_group_owned_repo(group_id,
                                                               wiki_name,
                                                               permission,
                                                               password,
                                                               enc_version=ENCRYPTED_LIBRARY_VERSION,
                                                               storage_id=storage_id)
                else:
                    # STORAGE_CLASS_MAPPING_POLICY == 'REPO_ID_MAPPING'
                    repo_id = SeafileAPI.add_group_owned_repo(
                        group_id, wiki_name, password, permission, org_id=org_id)
            else:
                repo_id = SeafileAPI.add_group_owned_repo(
                    group_id, wiki_name, password, permission, org_id=org_id)
        else:
            if org_id and org_id > 0:
                repo_id = seafile_api.create_org_repo(wiki_name, '', wiki_owner, org_id)
            else:
                repo_id = seafile_api.create_repo(wiki_name, '', wiki_owner)

        try:
            seafile_db_api = SeafileDB()
            seafile_db_api.set_repo_type(repo_id, 'wiki')
        except Exception as e:
            logger.error(e)
            msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, msg)

        params = {
            'old_repo_id': old_repo_id,
            'new_repo_id': repo_id,
            'username': request.user.username,
        }

        try:
            task_id = add_convert_wiki_task(params=params)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({"task_id": task_id})


class WikiPageExport(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, wiki_id, page_id):
        export_type = request.GET.get('export_type')
        if export_type not in WIKI_PAGE_EXPORT_TYPES:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid export type')

        # resource check
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        repo_id = wiki.repo_id
        username = request.user.username
        wiki_config = get_wiki_config(repo_id, username)
        navigation = wiki_config.get('navigation', [])
        pages = wiki_config.get('pages', [])
        id_set = get_all_wiki_ids(navigation)
        if page_id not in id_set:
            error_msg = "Page not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        if not check_wiki_permission(wiki, username):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        page_path = ''
        page_name = ''
        doc_uuid = ''
        for page in pages:
            if page_id == page.get('id'):
                page_path = page.get('path')
                page_name = page.get('name')
                doc_uuid = page.get('docUuid')
                break
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, page_path)
            filename = os.path.basename(page_path)
            download_token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username)
            download_url = gen_file_get_url(download_token, filename)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        response = HttpResponse(content_type='application/octet-stream')
        if export_type == 'markdown':
            resp_with_md_file = sdoc_export_to_md(page_path, doc_uuid, download_url, 'sdoc', 'md')
            new_filename = f'{page_name}.md'
            encoded_filename = quote(new_filename)
            response.write(resp_with_md_file.content)
        elif export_type == 'sdoc':
            sdoc_export_redirect = reverse('seadoc_export', args=[doc_uuid])
            return HttpResponseRedirect(f'{sdoc_export_redirect}?wiki_page_name={page_name}.sdoc')

        response['Content-Disposition'] = 'attachment;filename*=utf-8''%s;filename="%s"' % (encoded_filename, encoded_filename)

        return response


class ImportConfluenceView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        # file check
        file = request.FILES.get('file')
        if not file:
            return api_error(status.HTTP_400_BAD_REQUEST, 'File is required')
        filename = file.name
        if not filename.endswith('.html.zip'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'File must be a zip file with .html.zip extension')
        
        # permission check
        username = request.user.username
        if not request.user.permissions.can_add_repo():
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to create library.')

        if not request.user.permissions.can_create_wiki():
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to create wiki.')
        
        # create wiki
        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id
        
        underscore_index = filename.rfind('_')
        if underscore_index != -1:
            wiki_name = filename[:underscore_index]
            space_key = filename[underscore_index + 1:-len('.html.zip')]
        else:
            wiki_name = filename 
            space_key = filename
        if org_id and org_id > 0:
            repo_id = seafile_api.create_org_repo(wiki_name, '', username, org_id)
        else:
            repo_id = seafile_api.create_repo(wiki_name, '', username)

        try:
            seafile_db_api = SeafileDB()
            seafile_db_api.set_repo_type(repo_id, 'wiki')
        except Exception as e:
            logger.error(e)
            msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, msg)

        seafile_server_url = f'{SERVICE_URL}/lib/{repo_id}/file/'
        # extract html zip
        extract_dir = self._extract_html_zip(file, space_key)
        if not extract_dir:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        wiki = Wiki.objects.get(wiki_id=repo_id)
        if not wiki:
            return api_error(status.HTTP_404_NOT_FOUND, 'Wiki not found')
        
        # handle zip file
        try:
            self._process_zip_file(wiki, extract_dir, seafile_server_url, username, space_key)
            shutil.rmtree(extract_dir)
        except Exception as e:
            logger.error(e)
            if os.path.exists(extract_dir):
                shutil.rmtree(extract_dir)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        
        repo = seafile_api.get_repo(repo_id)
        wiki = Wiki(repo, username)
        wiki_info = wiki.to_dict()
        wiki_info['owner_nickname'] = email2nickname(wiki.owner)

        return Response(wiki_info)

    def _extract_html_zip(self, zip_file, space_key):
        extract_dir = '/tmp/wiki'
        if not os.path.exists(extract_dir):
            os.mkdir(extract_dir)
        try:
            with ZipFile(zip_file, 'r') as zip_ref:
                all_entries = zip_ref.infolist()
                zip_ref.extractall(extract_dir)
                if all_entries:
                    first_entry = all_entries[1].filename
                    top_dir = first_entry.split('/')[0] if '/' in first_entry else None
                    if top_dir and top_dir != space_key:
                        old_path = f'{extract_dir}/{top_dir}'
                        new_path = f'{extract_dir}/{space_key}'
                        if os.path.exists(new_path):
                            shutil.rmtree(new_path)
                        if os.path.exists(old_path):
                            os.rename(old_path, new_path)
                
            return f'{extract_dir}/{space_key}'
        except Exception as e:
            logger.error(f"extract {zip_file} error: {e}")
            return False
    
    def _process_zip_file(self, wiki, directory, seafile_server_url, username, space_key):
        html_files = []
        dir_path = Path(directory).resolve()
        level_html = []
        for root, _, files in os.walk(dir_path):
            for file in files:
                if file.endswith('.html') and file != 'index.html':
                    html_files.append(Path(root) / file)
                if file.endswith('.html') and file == 'index.html':
                    level_html.append(Path(root) / file)
        
        md_output_dir = f'{directory}/md_output'
        sdoc_output_dir = f'{directory}/sdoc_output'
        attachment_dir = f'{directory}/attachments'
        if not os.path.exists(md_output_dir):
            os.mkdir(md_output_dir)
        if not os.path.exists(sdoc_output_dir):
            os.mkdir(sdoc_output_dir)

        # html to md
        cf_id_to_cf_title_map = {}
        for html_file in html_files:
            result = self._convert_html_to_md(html_file, md_output_dir, seafile_server_url)
            if result:
                cf_id_to_cf_title_map.update(result)
        
        # md to sdoc
        md_files = list(Path(md_output_dir).glob('*.md'))
        if not md_files:
            logger.warning(f" {md_output_dir} not found md files")
        for md_file in md_files:
            self._md_to_sdoc(md_file, sdoc_output_dir, username)
        sdoc_files = list(Path(sdoc_output_dir).glob('*.sdoc'))
        # handle and upload sdoc files
        wiki_id = wiki.repo_id
        wiki_config = get_wiki_config(wiki_id, username)
        cf_page_id_to_sf_page_id_map = {}
        cf_page_id_to_sf_obj_id_map = {}
        for sdoc_file in sdoc_files:
            page_name_to_id_map, page_name_to_obj_id_map, wiki_config = self._process_page(wiki_id, wiki_config, sdoc_file, username, cf_id_to_cf_title_map)
            if page_name_to_id_map:
                cf_page_id_to_sf_page_id_map.update(page_name_to_id_map)
            if page_name_to_obj_id_map:
                cf_page_id_to_sf_obj_id_map.update(page_name_to_obj_id_map)

        # handle page level
        navigation = self._handle_page_level(level_html[0], cf_page_id_to_sf_page_id_map)
        wiki_config['navigation'] = navigation
        wiki_config = json.dumps(wiki_config)
        save_wiki_config(wiki, username, wiki_config)

        # handle attachment
        exist_dir = []
        if os.path.exists(attachment_dir):
            self._upload_attachment(cf_page_id_to_sf_obj_id_map, attachment_dir, wiki_id, username, exist_dir)
        self._upload_cf_images(wiki_id, directory, username, exist_dir)

    
    def _convert_html_to_md(self, html_file, md_output_dir, seafile_server_url):
        try:
            html_file = Path(html_file).resolve()
            md_output_dir = Path(md_output_dir).resolve()
            
            with open(html_file, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            title_element = soup.find('h1', id='title-heading')
            title = title_element.get_text().strip() if title_element else Path(html_file).stem
            
            if ":" in title:
                title = title.split(":", 1)[1].strip()
            
            content_div = soup.find('div', id='main-content')
            if not content_div:
                logger.warning(f"{html_file} content not found")
                return False
            md_file = f'{md_output_dir}/{html_file.stem}.md'
            self._process_images_and_attachments(content_div, html_file, seafile_server_url)
            md_content = convert_to_markdown(content_div, keep_inline_images_in=['span','h2', 'p'])
            md_content = f"# {title}\n\n{md_content}"
            with open(md_file, 'w', encoding='utf-8') as f:
                f.write(md_content)
            try:
                os.remove(html_file)
            except Exception as e:
                logger.warning(f"delete html file {html_file} failed: {e}")
            
            return {html_file.stem: title}
        except Exception as e:
            logger.error(f"convert {html_file} failed: {e}")
            return False

    def _process_images_and_attachments(self, content_div, html_file, seafile_server_url):
        for a in content_div.find_all('a'):
            if 'confluence-embedded-file' in a.get('class', []):
                # If it is an attachment, delete the thumbnail corresponding to the attachment
                img = a.find('img')
                if img:
                    img.decompose()

                alias = a.get('data-linked-resource-default-alias', 'Unknown attachment')
                # update attachment name
                if alias:
                    a.clear()
                    a.append(f'{alias} (attachment) \t')
            href = a.get('href', '')
            if href and not href.startswith(('http:', 'https:')):
                # page redirect processing
                if href.startswith('/wiki/spaces/'):
                    last_slash_index = href.rfind('/')
                    if last_slash_index == -1:
                        continue
                    file_name = href[last_slash_index + 1:]
                    # TODO: need to handle the click file to jump to wiki sidebar, not to sdoc file
                    a.attrs['href'] = f""
                # TODO: if it is a link to other pages (Confluence page), then change to link to the other page in seafile file server
                elif href.endswith('.html'):
                    # href = href.replace('.html', '.sdoc')
                    a.attrs['href'] = f""
                # connect attachment:  currently only jump to the file
                else:
                    a.attrs['href'] = f"{seafile_server_url}/{href}"
            
        # process images
        for img in content_div.find_all('img'):
            src = img.get('src', '')
            if not src or src.startswith(('data:')):
                continue
            alt = img.get('alt', '')
            title = img.get('title', '')
            width = img.get('width', '')
            height = img.get('height', '')
            img_name = src.split('/')[-1]
            if '?' in img_name:
                img_name = img_name.split('?')[0]
            # if it is a relative path image
            if not src.startswith(('http:', 'https:')):
                try:
                    # calculate the full path of the image
                    if '?' in src:
                        src = src.split('?')[0]
                    img_path = (html_file.parent / src).resolve()
                    if img_path.exists():
                        # build new URL
                        img['src'] = f"/{img_name}"
                except Exception as e:
                    logger.warning(f"handle image {src} failed: {e}")
            
            if width or height:
                width_attr = f' width="{width}"' if width else ''
                height_attr = f' height="{height}"' if height else ''
                alt_attr = f' alt="{alt}"' if alt else ' alt="undefined"'
                title_attr = f' title="{title}"' if title else ' title="undefined"'
                
                new_img_html = f'<img src="{img["src"]}"{alt_attr}{title_attr}{width_attr}{height_attr} />'
                img.replace_with(BeautifulSoup(new_img_html, 'html.parser'))

    def _upload_attachment(self, cf_page_id_to_sf_obj_id_map, attachment_dir, wiki_id, username, exist_dir):
        # Image need to be uploaded to the appropriate sdoc directory in seafile
        attachment_dir = Path(attachment_dir).resolve()
        # Create the attachment directory in the wiki library
        wiki_attachment_dir = 'attachments'
        # Traverse all subdirectories and files in the attachment directory
        for root, _, files in os.walk(attachment_dir):
            # Get the relative path as the upload target path
            rel_path = os.path.relpath(root, attachment_dir)
            
            # Process the files in the current directory
            if files:
                # Set the target directory
                if rel_path == '.':
                    target_dir = wiki_attachment_dir
                else:
                    target_dir = os.path.join(wiki_attachment_dir, rel_path)
                
                # Get the obj_id of the page corresponding to the current directory
                page_name = os.path.basename(rel_path) if rel_path != '.' else None
                obj_id = cf_page_id_to_sf_obj_id_map.get(page_name)
                # Upload all files in the current directory
                for file_name in files:
                    file_path = os.path.join(root, file_name)
                    if not os.path.isfile(file_path):
                        continue
                    is_image = self._is_image_file(file_name)
                    if is_image and obj_id:
                        wiki_page_images_dir = 'images/sdoc/'
                        sdoc_image_dir = os.path.join(wiki_page_images_dir, obj_id)

                        if sdoc_image_dir not in exist_dir:
                            seafile_api.mkdir_with_parents(wiki_id, '/', sdoc_image_dir, username)
                            exist_dir.append(sdoc_image_dir)
                        self._upload_attachment_file(wiki_id, sdoc_image_dir, file_path, username)
                    else:   
                        # other files
                        if target_dir not in exist_dir:
                            seafile_api.mkdir_with_parents(wiki_id, '/', target_dir, username)
                            exist_dir.append(target_dir)
                        self._upload_attachment_file(wiki_id, target_dir, file_path, username)

    def _upload_cf_images(self, wiki_id, extract_dir, username, exist_dir):
        image_dir = os.path.join(extract_dir, 'images/')
        image_dir = os.path.normpath(image_dir)
        wiki_images_dir = 'images/'
        if os.path.exists(image_dir):
            for root, _, files in os.walk(image_dir):
                rel_path = os.path.relpath(root, image_dir)
                if rel_path == '.':
                    target_dir = wiki_images_dir
                else:
                    target_dir = os.path.join(wiki_images_dir, rel_path)
                if target_dir not in exist_dir:
                    seafile_api.mkdir_with_parents(wiki_id, '/', target_dir, username)
                    exist_dir.append(target_dir)
                for file in files:
                    file_path = os.path.join(root, file)
                    self._upload_attachment_file(wiki_id, target_dir, file_path, username)

    def _is_image_file(self, file_name):
        file_ext = file_name.split('.')[-1]
        return file_ext in PREVIEW_FILEEXT.get('Image')
    
    def _upload_attachment_file(self, repo_id, parent_dir, file_path, username):
        try:
            obj_id = json.dumps({'parent_dir': parent_dir})
            token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'upload', username, use_onetime=False)
            
            if not token:
                error_msg = 'Internal Server Error'
                logger.error(error_msg)
                return
            upload_link = gen_file_upload_url(token, 'upload-api')
            upload_link += '?ret-json=1'
            
            filename = os.path.basename(file_path)
            new_file_path = os.path.join(parent_dir, filename)
            new_file_path = os.path.normpath(new_file_path)
            
            data = {'parent_dir': parent_dir, 'target_file': new_file_path}
            files = {'file': open(file_path, 'rb')}
            
            resp = requests.post(upload_link, files=files, data=data)
            if not resp.ok:
                logger.error(f"upload file {filename} failed: {resp.text}")
        except Exception as e:
            logger.error(f"upload file {file_path} failed: {e}")
        finally:
            if 'files' in locals() and files.get('file') and not files['file'].closed:
                files['file'].close()

    def _handle_page_level(self, level_html, cf_page_id_to_sf_page_id_map):
        result = []
        html_file = level_html
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                html_content = f.read()
            soup = BeautifulSoup(html_content, 'html.parser')
            ul_element = soup.find('ul')
            if not ul_element:
                logger.warning(f"not found page level: {html_file}")
                return result
            result = self._parse_ul_structure(ul_element, cf_page_id_to_sf_page_id_map)
        except Exception as e:
            logger.error(f"handle page level error: {e}")
        
        return result
    
    def _parse_ul_structure(self, ul_element, cf_page_id_to_sf_page_id_map):
        result = []
        li = ul_element.find_all('li', recursive=False)[0]
        a_tag = li.find('a')
        if not a_tag:
            return
        href = a_tag.get('href', '')
        page_name = a_tag.get_text().strip()
        page_key = href.split('.')[0] if href else None
        page_id = cf_page_id_to_sf_page_id_map.get(page_key)
        
        if not page_id:
            page_id = cf_page_id_to_sf_page_id_map.get(page_name)
            if not page_id:
                logger.warning(f"not found page id: {page_name}, href: {href}")
                return
        
        page_node = {
            "id": page_id,
            "type": "page"
        }
        sub_uls = li.find_all('ul', recursive=False)
        if sub_uls:
            children = []
            for sub_ul in sub_uls:
                # recursively process sub ul
                sub_result = self._parse_ul_structure(sub_ul, cf_page_id_to_sf_page_id_map)
                if sub_result:
                    children.extend(sub_result)
            if children:
                page_node["children"] = children
        result.append(page_node)
        
        return result

    
    def _md_to_sdoc(self, md_file, sdoc_output_dir, username):
        try:
            sdoc_file = f"{sdoc_output_dir}/{md_file.stem}.sdoc"
            md_file_path = f"{md_file.parent}/{md_file.name}"
            resp = json.loads(md_to_sdoc(md_file_path, username))
            sdoc_content = resp.get('sdoc_content')
            with open(sdoc_file, 'w', encoding='utf-8') as f:
                f.write(sdoc_content)
            with open(sdoc_file, 'r', encoding='utf-8') as f:
                sdoc_content = f.read()

                return True
        except Exception as e:
            logger.error(f"md to sdoc {md_file} failed: {e}")
            return False

    def _process_page(self, wiki_id, wiki_config, sdoc_file, username, cf_id_to_cf_title_map):
        filename = os.path.basename(sdoc_file)
        cf_page_id = filename.split('.')[0]
        cf_page_title = cf_id_to_cf_title_map.get(cf_page_id)
        if not cf_page_title:
            cf_page_title = cf_page_id
        navigation = wiki_config.get('navigation', [])
        # side panel create page
        pages = wiki_config.get('pages', [])
        page_name = cf_page_title

        sdoc_uuid = uuid.uuid4()
        new_file_name = page_name + '.sdoc'
        parent_dir = os.path.join(WIKI_PAGES_DIR, str(sdoc_uuid))
        file_path = os.path.join(parent_dir, os.path.basename(sdoc_file))

        try:
            FileUUIDMap.objects.create_fileuuidmap_by_uuid(sdoc_uuid, wiki_id, parent_dir, filename, is_dir=False)
            # update wiki_config
            id_set = get_all_wiki_ids(navigation)
            new_page_id = gen_unique_id(id_set)
            is_find = [False]
            gen_new_page_nav_by_id(navigation, new_page_id, None, None,is_find)
            if not is_find[0]:
                error_msg = 'Current page does not exist'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
            seafile_api.mkdir_with_parents(wiki_id, '/', parent_dir.strip('/'), username)
            if not is_valid_dirent_name(new_file_name):
                return api_error(status.HTTP_400_BAD_REQUEST, 'name invalid.')
            # upload file
            try:
                obj_id = json.dumps({'parent_dir': parent_dir})
                self._upload_file(wiki_id, parent_dir, sdoc_file, obj_id, username, page_name)
            except Exception as e:
                if str(e) == 'Too many files in library.':
                    error_msg = _("The number of files in library exceeds the limit")
                    return api_error(HTTP_447_TOO_MANY_FILES_IN_LIBRARY, error_msg)
                else:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            page_name_to_id_map = {
                page_name: new_page_id
            }
            page_name_to_obj_id_map = {
                cf_page_id: str(sdoc_uuid)
            }
            new_page = {
                'id': new_page_id,
                'name': page_name,
                'path': file_path,
                'icon': '',
                'docUuid': str(sdoc_uuid),
                'locked': False
            }
            pages.append(new_page)

            if len(wiki_config) == 0:
                wiki_config['version'] = 1

            wiki_config['navigation'] = navigation
            wiki_config['pages'] = pages
        except Exception as e:
            logger.error(e)

        return page_name_to_id_map, page_name_to_obj_id_map, wiki_config
    def _upload_file(self, repo_id, parent_dir, sdoc_file, obj_id, username, page_name):
        try:
            token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'upload', username, use_onetime=False)
        except Exception as e:
            if str(e) == 'Too many files in library.':
                error_msg = _("The number of files in library exceeds the limit")
                return api_error(HTTP_447_TOO_MANY_FILES_IN_LIBRARY, error_msg)
            else:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        upload_link = gen_file_upload_url(token, 'upload-api')
        upload_link += '?ret-json=1'
        filename = f'{page_name}.sdoc'
        new_file_path = os.path.join(parent_dir, filename)
        new_file_path = os.path.normpath(new_file_path)
        
        data = {'parent_dir': parent_dir}
        files = {'file': open(sdoc_file, 'rb')}
        resp = requests.post(upload_link, files=files, data=data)
        if not resp.ok:
            logger.error('save file: %s failed: %s' % (filename, resp.text))
            return api_error(resp.status_code, resp.content)
