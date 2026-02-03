# Copyright (c) 2012-2016 Seafile Ltd.

import os
import json
import logging
import posixpath
import datetime
import uuid
import re
from copy import deepcopy
from constance import config
from urllib.parse import quote

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api, check_quota
from pysearpc import SearpcError
from django.utils.translation import gettext as _
from django.http import HttpResponse, HttpResponseRedirect
from django.urls import reverse

from seahub.api2.authentication import TokenAuthentication, SdocJWTTokenAuthentication
from seahub.api2.endpoints.utils import sdoc_export_to_md
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, is_wiki_repo, to_python_boolean
from seahub.utils.db_api import SeafileDB
from seahub.wiki2.models import Wiki2 as Wiki
from seahub.wiki.models import Wiki as OldWiki
from seahub.wiki2.models import WikiPageTrash, Wiki2Publish, WikiFileViews, Wiki2Settings
from seahub.repo_metadata.models import RepoMetadata
from seahub.repo_metadata.metadata_server_api import list_metadata_view_records
from seahub.wiki2.utils import get_wiki_config, WIKI_PAGES_DIR, is_group_wiki, \
    check_wiki_admin_permission, check_wiki_permission, get_all_wiki_ids, get_and_gen_page_nav_by_id, \
    get_current_level_page_ids, save_wiki_config, gen_unique_id, gen_new_page_nav_by_id, pop_nav, \
    delete_page, move_nav, revert_nav, get_sub_ids_by_page_id, get_parent_id_stack, add_convert_wiki_task, \
    import_conflunece_to_wiki, import_wiki_page

from seahub.utils import is_org_context, get_user_repos, is_pro_version, is_valid_dirent_name, \
    get_no_duplicate_obj_name, HAS_FILE_SEARCH, HAS_FILE_SEASEARCH, gen_file_get_url, get_service_url
if HAS_FILE_SEARCH or HAS_FILE_SEASEARCH:
    from seahub.search.utils import search_wikis, ai_search_wikis, SEARCH_REPOS_LIMIT

from seahub.views import check_folder_permission
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.file_op import check_file_lock
from seahub.utils.repo import get_repo_owner, is_valid_repo_id_format, is_group_repo_staff, is_repo_owner
from seahub.seadoc.utils import get_seadoc_file_uuid, gen_seadoc_access_token, copy_sdoc_images_with_sdoc_uuid
from seahub.settings import ENABLE_STORAGE_CLASSES, STORAGE_CLASS_MAPPING_POLICY, \
    ENCRYPTED_LIBRARY_VERSION, SERVICE_URL, MAX_CONFLUENCE_FILE_SIZE
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

        if not is_valid_dirent_name(wiki_name):
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
            wiki_info['group_name'] = group_id_to_name(group_id)

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
            'wiki_ids': search_wiki,
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


class Wiki2MultiSearch(APIView):
    """API endpoint for searching across multiple wikis that user has access to."""
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        def iterate_pages(pages):
            for page in pages or []:
                yield page
                for child in iterate_pages(page.get('children', [])):
                    yield child

        if not HAS_FILE_SEARCH and not HAS_FILE_SEASEARCH:
            error_msg = 'Search not supported.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        query = request.data.get('query', '').strip()
        if not query:
            return api_error(status.HTTP_400_BAD_REQUEST, 'query invalid.')

        try:
            count = int(request.data.get('count', 20))
        except:
            count = 20

        username = request.user.username
        org_id = request.user.org.org_id if is_org_context(request) else None

        # Get all wikis user has access to
        (owned, shared, groups, public) = get_user_repos(username, org_id)

        owned_wikis = [r for r in owned if is_wiki_repo(r)]
        shared_wikis = [r for r in shared if is_wiki_repo(r)]
        group_wikis = [r for r in groups if is_wiki_repo(r)]

        # Collect all accessible wiki IDs
        wiki_ids = list(set(
            [w.repo_id for w in owned_wikis] +
            [w.repo_id for w in shared_wikis] +
            [w.repo_id for w in group_wikis]
        ))

        # Apply search limit (same as repo search limit: 200)
        wiki_ids = wiki_ids[:SEARCH_REPOS_LIMIT]

        if not wiki_ids:
            return Response({"results": [], "total": 0})

        params = {
            'query': query,
            'wiki_ids': wiki_ids,
            'count': count,
        }

        if HAS_FILE_SEARCH:
            try:
                results = search_wikis(wiki_ids, query, count)
                total = len(results)
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        elif HAS_FILE_SEASEARCH:
            try:
                results, total = ai_search_wikis(params)
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not results:
             return Response({"results": [], "total": 0})

        wiki_ids_in_results = set()
        for result in results:
            wiki_id = result.get('wiki_id') or result.get('repo_id')
            if wiki_id:
                wiki_ids_in_results.add(wiki_id)

        wiki_name_map = {}
        wiki_docuuid_page_map = {}
        for wiki_id in wiki_ids_in_results:
            try:
                repo = seafile_api.get_repo(wiki_id)
                if repo:
                    wiki_name_map[wiki_id] = repo.name
            except Exception as e:
                logger.error(e)

            try:
                wiki_config = get_wiki_config(wiki_id, username)
                pages = wiki_config.get('pages', [])
                docuuid_page_map = {}
                for page in iterate_pages(pages):
                    doc_uuid = page.get('docUuid')
                    if doc_uuid:
                        docuuid_page_map[doc_uuid] = page
                wiki_docuuid_page_map[wiki_id] = docuuid_page_map
            except Exception as e:
                logger.error(e)

        for result in results:
            wiki_id = result.get('wiki_id') or result.get('repo_id')
            if wiki_id and wiki_id in wiki_name_map:
                result['wiki_name'] = wiki_name_map[wiki_id]
            doc_uuid = result.get('doc_uuid')
            if wiki_id and doc_uuid and wiki_id in wiki_docuuid_page_map:
                page = wiki_docuuid_page_map[wiki_id].get(doc_uuid)
                if page:
                    result['page_id'] = page.get('id')
                    if not result.get('title'):
                        title = page.get('title') or page.get('name')
                        if title:
                            result['title'] = title

        return Response({"results": results, "total": total})

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

        if not is_valid_dirent_name(wiki_name):
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
        file_size = file.size
        if file_size > MAX_CONFLUENCE_FILE_SIZE:
            return api_error(status.HTTP_400_BAD_REQUEST, 'File is too large')
        # permission check
        username = request.user.username
        if not request.user.permissions.can_add_repo():
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to create library.')

        if not request.user.permissions.can_create_wiki():
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to create wiki.')
        
        group_id = request.data.get('group_id', None)
        org_id = request.user.org.org_id if is_org_context(request) else -1
        
        underscore_index = filename.rfind('_')
        if underscore_index != -1:
            # The file name for exporting the script is spaceName_spaceId.html.zip
            wiki_name = filename[:underscore_index]
            space_key = filename[underscore_index + 1:-len('.html.zip')]
        elif 'Confluence-space-export-' in filename:
            # The manually exported file name is Confluence-space-export-id.html.zip
            wiki_name = filename[:-len('.html.zip')]
            space_key = filename[len('Confluence-space-export-'):-len('.html.zip')]
        else:
            wiki_name = filename[:-len('.html.zip')]
            space_key = wiki_name
        
        # create wiki
        try:
            repo_id = self._create_wiki(group_id, wiki_name, org_id, username)
            seafile_db_api = SeafileDB()
            seafile_db_api.set_repo_type(repo_id, 'wiki')
        except Exception as e:
            logger.error(e)
            msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, msg)
        seafile_server_url = f'{SERVICE_URL}/lib/{repo_id}/file/'
        wiki = Wiki.objects.get(wiki_id=repo_id)
        if not wiki:
            return api_error(status.HTTP_404_NOT_FOUND, 'Wiki not found')
        extract_dir = '/tmp/wiki'
        space_dir = os.path.join(extract_dir, space_key)
        if not os.path.exists(space_dir):
            os.makedirs(space_dir)
        try:
            tmp_zip_file = os.path.join(space_dir, filename)
            with open(tmp_zip_file, 'wb') as f:
                for chunk in file.chunks():
                    f.write(chunk)
        except Exception as e:
            logger.error(e)
            msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, msg)

        task_id = import_conflunece_to_wiki({
            'repo_id': repo_id,
            'space_key': space_key,
            'file_path': tmp_zip_file,
            'tmp_zip_file': tmp_zip_file,
            'username': username,
            'seafile_server_url': seafile_server_url
        })

        return Response({'task_id': task_id})
    
    def _create_wiki(self, group_id, wiki_name, org_id, username):
        permission = PERMISSION_READ_WRITE
        if group_id:
            group_id = int(group_id)
            # only group admin can create wiki
            if not is_group_admin(group_id, username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            group_quota = seafile_api.get_group_quota(group_id)
            group_quota = int(group_quota)
            if group_quota <= 0 and group_quota != -2:
                error_msg = 'No group quota.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # create group owned repo
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
        return repo_id


class Wiki2ImportPageView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)
    
    def post(self, request, wiki_id):
        from_page_id = request.data.get('from_page_id', None)
        file = request.data.get('file', None)

        if not file:
            error_msg = 'file invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        filename = file.name
        extension = filename.split('.')[-1].lower()
        if extension not in  ['docx', 'md']:
            error_msg = 'file invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki.owner = get_repo_owner(request, wiki_id)
        username = request.user.username
        if not check_wiki_admin_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki_id
        if check_quota(repo_id) < 0:
            return api_error(443, _("Out of quota."))

        tmp_wiki_path = '/tmp/wiki/page'
        if not os.path.exists(tmp_wiki_path):
            os.makedirs(tmp_wiki_path)

        local_file_path = os.path.join(tmp_wiki_path, filename)
        with open(local_file_path, 'wb') as f:
            f.write(file.read())

        wiki_config = get_wiki_config(repo_id, username)
        navigation = wiki_config.get('navigation', [])
        if not from_page_id:
            page_ids = {element.get('id') for element in navigation if element.get('type') != 'folder'}
        else:
            page_ids = []
            get_current_level_page_ids(navigation, from_page_id, page_ids)
        pages = wiki_config.get('pages', [])
        exist_page_names = [page.get('name') for page in pages if page.get('id') in page_ids]

        page_name = os.path.splitext(filename)[0]
        page_name = get_no_duplicate_obj_name(page_name, exist_page_names)
        sdoc_uuid_str = str(uuid.uuid4())
        parent_dir = os.path.join(WIKI_PAGES_DIR, sdoc_uuid_str)
        id_set = get_all_wiki_ids(navigation)
        new_page_id = gen_unique_id(id_set)
        if extension == 'docx':
            sdoc_filename = f'{filename.split(extension)[0]}sdoc'
        elif extension == 'md':
            sdoc_filename = f'{filename.split(extension)[0]}sdoc'
        
        sdoc_file_path = os.path.join(parent_dir, sdoc_filename)

        task_id = import_wiki_page({
            'repo_id': repo_id,
            'file_path': local_file_path,
            'username': username,
            'page_id': new_page_id,
            'page_name': page_name,
            'sdoc_uuid_str': sdoc_uuid_str,
            'parent_dir': parent_dir,
            'from_page_id': from_page_id,
        })

        return Response({
            'page_id': new_page_id,
            'path': sdoc_file_path,
            'name': page_name,
            'docUuid': sdoc_uuid_str,
            'task_id': task_id
        })


class Wiki2SettingsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )
    
    def get(self, request, wiki_id):
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner
        
        username = request.user.username
        permission = check_wiki_permission(wiki, username)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            wiki_settings = Wiki2Settings.objects.filter(wiki_id=wiki_id).first()
            if not wiki_settings:
                Wiki2Settings.objects.create(wiki_id=wiki_id, enable_link_repos=True, linked_repos=[])
                return Response({
                    'enable_link_repos': True,
                    'linked_repos': []
                })
        except Exception as e:
            logger.error(f'Error getting wiki settings: {e}')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        return Response(wiki_settings.to_dict())
    
    def put(self, request, wiki_id):
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            return api_error(status.HTTP_404_NOT_FOUND, 'Wiki not found.')

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        permission = check_wiki_permission(wiki, username)
        if permission != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        
        enable_link_repos = request.data.get('enable_link_repos', 'false')
        if enable_link_repos not in ('true', 'false'):
            error_msg = 'enable_link_repos invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        enable_link_repos = to_python_boolean(enable_link_repos)
            
        try:
            wiki_settings, created = Wiki2Settings.objects.get_or_create(
                wiki_id=wiki_id,
                defaults={'enable_link_repos': True, 'linked_repos': '[]'}
            )
            wiki_settings.enable_link_repos = enable_link_repos
            wiki_settings.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response(wiki_settings.to_dict())


class Wiki2LinkedReposView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )
    
    def post(self, request, wiki_id):
        repo_id = request.data.get('repo_id')
        if not repo_id:
            error_msg = 'repo_id is required.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if repo_id == wiki_id:
            error_msg = 'Wiki can not be linked to itself.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            return api_error(status.HTTP_404_NOT_FOUND, 'Wiki not found.')

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        repo_admin = is_repo_admin(username, repo_id)
        if not repo_admin:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        
        wiki_settings, created = Wiki2Settings.objects.get_or_create(
            wiki_id=wiki_id,
            defaults={'enable_link_repos': True, 'linked_repos': '[]'}
        )
        if not wiki_settings.enable_link_repos:
            error_msg = f'The wiki link repos is disabled for wiki {wiki_id}.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = f'Library {repo_id} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if repo.repo_type == 'wiki':
            error_msg = f'The wiki {repo_id} is not linked to wiki {wiki_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        linked_repos = wiki_settings.linked_repos
        if repo_id in linked_repos:
            error_msg = f'The wiki {repo_id} is already linked to wiki {wiki_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        try:
            wiki_settings.add_linked_repo(repo_id)
            wiki_settings.save()
        except Exception as e:
            logger.error(f'Error adding linked repo: {e}')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        
        return Response({"success": True})

    
    def delete(self, request, wiki_id):
        repo_id = request.data.get('repo_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id is required.')
        
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            return api_error(status.HTTP_404_NOT_FOUND, 'Wiki not found.')

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        wiki_permission = check_wiki_permission(wiki, username)
        if wiki_permission != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        
        wiki_settings = Wiki2Settings.objects.filter(wiki_id=wiki_id).first()
        if not wiki_settings or not wiki_settings.enable_link_repos:
            error_msg = f'The wiki link repos is disabled for wiki {wiki_id}.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        try:
            wiki_settings.remove_linked_repo(repo_id)
            wiki_settings.save()
            WikiFileViews.objects.delete_views_by_repo_id(wiki_id, repo_id)
        except Exception as e:
            logger.error(f'Error removing linked repo: {e}')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        
        return Response({"success": True})

class Wiki2FileViews(APIView):
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )
    
    def get(self, request, wiki_id):
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        permission = check_wiki_permission(wiki, username)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki_settings = Wiki2Settings.objects.filter(wiki_id=wiki_id).first()
        if not wiki_settings or not wiki_settings.enable_link_repos:
            return Response([])
        try:
            wiki_views = WikiFileViews.objects.list_views(wiki_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response(wiki_views)
    
    def post(self, request, wiki_id):
        #  Add a wiki view
        view_name = request.data.get('name')
        view_type = request.data.get('type', 'table')
        link_repo_id = request.data.get('link_repo_id')
        view_data = request.data.get('data', {})

        # check view name
        if not view_name:
            error_msg = 'view name is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if not link_repo_id:
            error_msg = 'link repo id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        permission = check_wiki_permission(wiki, username)
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki_settings = Wiki2Settings.objects.filter(wiki_id=wiki_id).first()
        if not wiki_settings or not wiki_settings.enable_link_repos:
            error_msg = f'The wiki link repos is disabled for wiki {wiki_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        wiki_linked_repos = wiki_settings.get_linked_repos()
        if link_repo_id not in wiki_linked_repos:
            error_msg = f'The repo {link_repo_id} is not linked to wiki {wiki_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            new_view = WikiFileViews.objects.add_view(wiki_id, view_name, link_repo_id, view_type, view_data)
            if not new_view:
                return api_error(status.HTTP_400_BAD_REQUEST, 'add view failed')
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'view': new_view})

    def put(self, request, wiki_id):
        # Update a wiki view, including rename
        # by a json data
        view_id = request.data.get('view_id', None)
        view_data = request.data.get('view_data', None)
        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if not view_data:
            error_msg = 'view_data is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        permission = check_wiki_permission(wiki, username)
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki_settings = Wiki2Settings.objects.filter(wiki_id=wiki_id).first()
        if not wiki_settings or not wiki_settings.enable_link_repos:
            error_msg = f'The wiki link repos is disabled for wiki {wiki_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        views = WikiFileViews.objects.filter(
            wiki_id=wiki_id,
        ).first()
        if not views:
            error_msg = 'The wiki views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if view_id not in views.views_ids:
            error_msg = 'view_id %s does not exists.' % view_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            WikiFileViews.objects.update_view(wiki_id, view_id, view_data)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request, wiki_id):
        # Delete a wiki view
        view_id = request.data.get('view_id', None)
        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        permission = check_wiki_permission(wiki, username)
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki_settings = Wiki2Settings.objects.filter(wiki_id=wiki_id).first()
        if not wiki_settings or not wiki_settings.enable_link_repos:
            error_msg = f'The wiki link repos is disabled for wiki {wiki_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        views = WikiFileViews.objects.filter(
            wiki_id=wiki_id,
        ).first()
        if not views:
            error_msg = 'The wiki views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check view exist
        if view_id not in views.views_ids:
            error_msg = 'view_id %s does not exists.' % view_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            WikiFileViews.objects.delete_view(wiki_id, view_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

class Wiki2FileView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )
    
    def get(self, request, wiki_id, view_id):
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        permission = check_wiki_permission(wiki, username)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki_settings = Wiki2Settings.objects.filter(wiki_id=wiki_id).first()
        if not wiki_settings or not wiki_settings.enable_link_repos:
            error_msg = f'The wiki link repos is disabled for wiki {wiki_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        try:
            view = WikiFileViews.objects.get_view(wiki_id, view_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response({'view': view})

class Wiki2FileViewDuplicateView(APIView):
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )
    
    def post(self, request, wiki_id):
        view_id = request.data.get('view_id', None)
        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner

        username = request.user.username
        permission = check_wiki_permission(wiki, username)
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki_settings = Wiki2Settings.objects.filter(wiki_id=wiki_id).first()
        if not wiki_settings or not wiki_settings.enable_link_repos:
            error_msg = f'The wiki link repos is disabled for wiki {wiki_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        try:
            wiki_file_views = WikiFileViews.objects.filter(wiki_id=wiki_id).first()
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        if view_id not in wiki_file_views.views_ids:
            error_msg = 'view_id %s does not exists.' % view_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        try:
            new_view = WikiFileViews.objects.duplicate_view(wiki_id, view_id)
            if not new_view:
                return api_error(status.HTTP_400_BAD_REQUEST, 'duplicate view failed')
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response({'view': new_view})

class Wiki2FileViewRecords(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )
    
    def get(self, request, wiki_id, view_id):
        start = request.GET.get('start', 0)
        limit = request.GET.get('limit', 1000)
        try:
            start = int(start)
            limit = int(limit)
        except:
            start = 0
            limit = 1000

        if start < 0:
            error_msg = 'start invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if limit < 0:
            error_msg = 'limit invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        wiki = Wiki.objects.get(wiki_id=wiki_id)
        if not wiki:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, wiki_id)
        wiki.owner = repo_owner
        username = request.user.username
        wiki_publish = Wiki2Publish.objects.filter(repo_id=wiki_id).first()
        if not wiki_publish:
            permission = check_wiki_permission(wiki, username)
            if not permission:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki_settings = Wiki2Settings.objects.filter(wiki_id=wiki_id).first()
        if not wiki_settings or not wiki_settings.enable_link_repos:
            error_msg = f'The wiki link repos is disabled for wiki {wiki_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            view = WikiFileViews.objects.get_view(wiki_id, view_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        if not view:
            error_msg = 'Wiki file view %s not found.' % view_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # metadata enable check
        repo_id = view.get('linked_repo_id')
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            results = list_metadata_view_records(repo_id, username, view, False, start, limit)
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(results)
