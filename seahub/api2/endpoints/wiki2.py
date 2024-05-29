# Copyright (c) 2012-2016 Seafile Ltd.

import os
import json
import logging
import requests
import posixpath
import time
import uuid
import urllib.request, urllib.error, urllib.parse

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api, edit_repo
from pysearpc import SearpcError
from django.utils.translation import gettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.wiki2.models import Wiki2 as Wiki
from seahub.wiki2.utils import is_valid_wiki_name, can_edit_wiki, get_wiki_dirs_by_path, \
    get_wiki_config, WIKI_PAGES_DIR, WIKI_CONFIG_PATH, WIKI_CONFIG_FILE_NAME, is_group_wiki, \
    check_wiki_admin_permission, check_wiki_permission
from seahub.utils import is_org_context, get_user_repos, gen_inner_file_get_url, gen_file_upload_url, \
    normalize_dir_path, is_pro_version, check_filename_with_rename, is_valid_dirent_name
from seahub.views import check_folder_permission
from seahub.views.file import send_file_access_msg
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.file_op import check_file_lock, ONLINE_OFFICE_LOCK_OWNER, if_locked_by_online_office
from seahub.utils.repo import parse_repo_perm
from seahub.seadoc.utils import get_seadoc_file_uuid, gen_seadoc_access_token
from seahub.settings import SEADOC_SERVER_URL, ENABLE_STORAGE_CLASSES, STORAGE_CLASS_MAPPING_POLICY, \
    ENCRYPTED_LIBRARY_VERSION
from seahub.seadoc.sdoc_server_api import SdocServerAPI
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.tags.models import FileUUIDMap
from seahub.seadoc.models import SeadocHistoryName, SeadocDraft, SeadocCommentReply
from seahub.base.models import FileComment
from seahub.api2.views import HTTP_447_TOO_MANY_FILES_IN_LIBRARY
from seahub.group.utils import group_id_to_name, is_group_admin
from seahub.utils.rpc import SeafileAPI
from seahub.constants import PERMISSION_READ_WRITE

HTTP_520_OPERATION_FAILED = 520


logger = logging.getLogger(__name__)


class Wikis2View(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        """List all wikis.
        """
        # parse request params
        filter_by = {
            'mine': False,
            'shared': False,
            'group': False,
            'org': False,
        }

        rtype = request.GET.get('type', "")
        if not rtype:
            # set all to True, no filter applied
            filter_by = filter_by.fromkeys(iter(filter_by.keys()), True)

        for f in rtype.split(','):
            f = f.strip()
            filter_by[f] = True

        username = request.user.username
        org_id = request.user.org.org_id if is_org_context(request) else None
        (owned, shared, groups, public) = get_user_repos(username, org_id)

        filter_repo_ids = []
        if filter_by['mine']:
            filter_repo_ids += ([r.id for r in owned])

        if filter_by['shared']:
            filter_repo_ids += ([r.id for r in shared])

        if filter_by['group']:
            filter_repo_ids += ([r.id for r in groups])

        if filter_by['org']:
            filter_repo_ids += ([r.id for r in public])

        filter_repo_ids = list(set(filter_repo_ids))

        wikis = Wiki.objects.filter(repo_id__in=filter_repo_ids)

        wiki_list = []
        for wiki in wikis:
            wiki_info = wiki.to_dict()
            if is_group_wiki(wiki):
                wiki_info['owner_nickname'] = group_id_to_name(wiki.owner)
            else:
                wiki_info['owner_nickname'] = email2nickname(wiki.owner)
            wiki_list.append(wiki_info)

        return Response({'wikis': wiki_list})

    def post(self, request, format=None):
        """Add a new wiki.
        """
        username = request.user.username

        if not request.user.permissions.can_add_repo():
            return api_error(status.HTTP_403_FORBIDDEN, 'You do not have permission to create library.')

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
            wiki = Wiki.objects.add(wiki_name=wiki_name, owner=wiki_owner, repo_id=repo_id)
        except Exception as e:
            logger.error(e)
            msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, msg)

        wiki_info = wiki.to_dict()
        if not is_group_owner:
            wiki_info['owner_nickname'] = email2nickname(wiki.owner)
        else:
            wiki_info['owner_nickname'] = group_id_to_name(wiki.owner)

        return Response(wiki_info)


class Wiki2View(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, wiki_id):
        """Delete a wiki.
        """
        username = request.user.username
        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = 'Wiki not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not check_wiki_admin_permission(wiki, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki.delete()

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        if is_group_wiki(wiki):
            group_id = int(wiki.owner)
            try:
                SeafileAPI.delete_group_owned_repo(group_id, wiki.repo_id, org_id)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        else:
            seafile_api.remove_repo(wiki.repo_id)

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
        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not check_wiki_permission(wiki, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki.repo_id
        obj_id = json.dumps({'parent_dir': WIKI_CONFIG_PATH})

        dir_id = seafile_api.get_dir_id_by_path(repo_id, WIKI_CONFIG_PATH)
        if not dir_id:
            seafile_api.mkdir_with_parents(repo_id, '/', WIKI_CONFIG_PATH, username)

        token = seafile_api.get_fileserver_access_token(
            repo_id, obj_id, 'upload-link', username, use_onetime=False)
        if not token:
            return None
        upload_link = gen_file_upload_url(token, 'upload-api')
        upload_link = upload_link + '?replace=1'

        files = {
            'file': (WIKI_CONFIG_FILE_NAME, wiki_config)
        }
        data = {'parent_dir': WIKI_CONFIG_PATH, 'relative_path': '', 'replace': 1}
        resp = requests.post(upload_link, files=files, data=data)
        if not resp.ok:
            logger.error(resp.text)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        wiki = wiki.to_dict()
        wiki['wiki_config'] = wiki_config
        return Response({'wiki': wiki})

    def get(self, request, wiki_id):

        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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


class Wiki2PagesDirView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticatedOrReadOnly,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, wiki_id):
        """List all dir files in a wiki.
        """
        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = request.GET.get("p", '/')
        parent_dir = normalize_dir_path(parent_dir)
        permission = check_folder_permission(request, wiki.repo_id, parent_dir)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = "Internal Server Error"
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        with_parents = request.GET.get('with_parents', 'false')
        if with_parents not in ('true', 'false'):
            error_msg = 'with_parents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        with_parents = to_python_boolean(with_parents)
        dir_id = seafile_api.get_dir_id_by_path(repo.repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir_list = []
        if not with_parents:
            # only return dirent list in current parent folder
            parent_dir_list.append(parent_dir)
        else:
            # if value of 'p' parameter is '/a/b/c' add with_parents's is 'true'
            # then return dirent list in '/', '/a', '/a/b' and '/a/b/c'.
            if parent_dir == '/':
                parent_dir_list.append(parent_dir)
            else:
                tmp_parent_dir = '/'
                parent_dir_list.append(tmp_parent_dir)
                for folder_name in parent_dir.strip('/').split('/'):
                    tmp_parent_dir = posixpath.join(tmp_parent_dir, folder_name)
                    parent_dir_list.append(tmp_parent_dir)

        all_dirs_info = []
        for parent_dir in parent_dir_list:
            all_dirs = get_wiki_dirs_by_path(repo.repo_id, parent_dir, [])
            all_dirs_info += all_dirs

        return Response({
            "dirent_list": all_dirs_info
        })


class Wiki2PageContentView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticatedOrReadOnly,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, wiki_id):
        """Get content of a wiki
        """
        path = request.GET.get('p', '/')
        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not check_wiki_permission(wiki, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        permission = check_folder_permission(request, wiki.repo_id, '/')
        if not permission:
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

        try:
            file_id = seafile_api.get_file_id_by_path(repo.repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get file id by path.")
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        # send stats message
        send_file_access_msg(request, repo, path, 'api')

        file_uuid = get_seadoc_file_uuid(repo, path)
        filename = os.path.basename(path)

        try:
            sdoc_server_api = SdocServerAPI(file_uuid, filename, request.user.username)
            res = sdoc_server_api.get_doc()
            content = json.dumps(res)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            dirent = seafile_api.get_dirent_by_path(repo.repo_id, path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
            else:
                latest_contributor, last_modified = None, 0
        except SearpcError as e:
            logger.error(e)
            latest_contributor, last_modified = None, 0

        assets_url = '/api/v2.1/seadoc/download-image/' + file_uuid
        seadoc_access_token = gen_seadoc_access_token(file_uuid, filename, request.user.username, permission=permission)

        return Response({
            "content": content,
            "latest_contributor": email2nickname(latest_contributor),
            "last_modified": last_modified,
            "permission": permission,
            "seadoc_server_url": SEADOC_SERVER_URL,
            "seadoc_access_token": seadoc_access_token,
            "assets_url": assets_url,
        })


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
            'mtime': timestamp_to_isoformat_timestr(file_obj.mtime) if file_obj else ''
        }

        return file_info

    def post(self, request, wiki_id):
        page_name = request.data.get('page_name', None)

        if not page_name or '/' in page_name or '\\' in page_name:
            error_msg = 'page_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not check_wiki_permission(wiki, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki.repo_id

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        sdoc_uuid = uuid.uuid4()
        file_name = page_name + '.sdoc'
        parent_dir = os.path.join(WIKI_PAGES_DIR, str(sdoc_uuid))
        path = os.path.join(parent_dir, file_name)

        seafile_api.mkdir_with_parents(repo_id, '/', parent_dir.strip('/'), request.user.username)
        new_file_name = check_filename_with_rename(repo_id, parent_dir, file_name)

        # create new empty file
        if not is_valid_dirent_name(new_file_name):
            return api_error(status.HTTP_400_BAD_REQUEST, 'name invalid.')

        new_file_name = check_filename_with_rename(repo_id, parent_dir, new_file_name)
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

        new_file_path = posixpath.join(parent_dir, new_file_name)
        file_info = self.get_file_info(repo_id, new_file_path)
        file_info['doc_uuid'] = sdoc_uuid
        filename = os.path.basename(path)

        try:
            FileUUIDMap.objects.create_fileuuidmap_by_uuid(sdoc_uuid, repo_id, parent_dir, filename, is_dir=False)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(file_info)


class Wiki2PageView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, wiki_id, page_id):

        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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

        # send stats message
        send_file_access_msg(request, repo, path, 'api')

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
        seadoc_access_token = gen_seadoc_access_token(doc_uuid, filename, request.user.username, permission=permission)

        return Response({
            "latest_contributor": email2nickname(latest_contributor),
            "last_modified": last_modified,
            "permission": permission,
            "seadoc_access_token": seadoc_access_token,
            "assets_url": assets_url,
        })

    def delete(self, request, wiki_id, page_id):
        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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

        if not page_info:
            error_msg = 'page %s not found.' % page_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check file lock
        try:
            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if is_locked and not locked_by_me:
            error_msg = _("File is locked")
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        sdoc_dir_path = os.path.dirname(path)
        parent_dir = os.path.dirname(sdoc_dir_path)
        dir_name = os.path.basename(sdoc_dir_path)

        # delete the folder where the sdoc is located
        try:
            seafile_api.del_file(repo_id, parent_dir, json.dumps([dir_name]), username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:  # rm sdoc fileuuid
            file_name = os.path.basename(path)
            file_uuid = get_seadoc_file_uuid(repo, path)
            FileComment.objects.filter(uuid=file_uuid).delete()
            FileUUIDMap.objects.delete_fileuuidmap_by_path(repo_id, sdoc_dir_path, file_name, is_dir=False)
            SeadocHistoryName.objects.filter(doc_uuid=file_uuid).delete()
            SeadocDraft.objects.filter(doc_uuid=file_uuid).delete()
            SeadocCommentReply.objects.filter(doc_uuid=file_uuid).delete()
        except Exception as e:
            logger.error(e)

        return Response({'success': True})
