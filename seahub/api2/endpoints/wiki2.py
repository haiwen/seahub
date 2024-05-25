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
from seahub.wiki2.utils import is_valid_wiki_name, can_edit_wiki, get_wiki_dirs_by_path, get_page_dir_paths_in_folder
from seahub.utils import is_org_context, get_user_repos, gen_inner_file_get_url, gen_file_upload_url, \
    normalize_dir_path, is_pro_version, check_filename_with_rename, is_valid_dirent_name
from seahub.views import check_folder_permission
from seahub.views.file import send_file_access_msg
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.file_op import check_file_lock, ONLINE_OFFICE_LOCK_OWNER, if_locked_by_online_office
from seahub.utils.repo import parse_repo_perm
from seahub.seadoc.utils import get_seadoc_file_uuid, gen_seadoc_access_token
from seahub.settings import SEADOC_SERVER_URL
from seahub.seadoc.sdoc_server_api import SdocServerAPI
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.tags.models import FileUUIDMap
from seahub.seadoc.models import SeadocHistoryName, SeadocDraft, SeadocCommentReply
from seahub.base.models import FileComment

WIKI_PAGES_DIR = '/wiki-pages'
WIKI_CONFIG_PATH = '_Internal/Wiki'
WIKI_CONFIG_FILE_NAME = 'index.json'
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
            wiki_info['can_edit'] = (username == wiki.username)
            wiki_list.append(wiki_info)

        return Response({'data': wiki_list})

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

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        try:
            wiki = Wiki.objects.add(wiki_name=wiki_name, username=username, org_id=org_id)
        except Exception as e:
            logger.error(e)
            msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, msg)

        return Response(wiki.to_dict())


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
        owner = wiki.username
        if owner != username:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki.delete()

        repo_id = wiki.repo_id
        file_name = WIKI_CONFIG_FILE_NAME
        try:
            seafile_api.del_file(repo_id, WIKI_CONFIG_PATH,
                                 json.dumps([file_name]),
                                 request.user.username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response()


class Wiki2ConfigView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, wiki_id):
        """Edit a wiki config
        """
        username = request.user.username

        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_edit_wiki(wiki, request.user.username):
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

        wiki_config = request.data.get('wiki_config', '{}')

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

        if not can_edit_wiki(wiki, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        path = posixpath.join(WIKI_CONFIG_PATH, WIKI_CONFIG_FILE_NAME)
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
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        wiki = wiki.to_dict()
        if not file_id:
            wiki['wiki_config'] = '{}'
            return Response({'wiki': wiki})

        token = seafile_api.get_fileserver_access_token(repo.repo_id, file_id, 'download', request.user.username, use_onetime=True)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        url = gen_inner_file_get_url(token, WIKI_CONFIG_FILE_NAME)
        resp = requests.get(url)
        content = resp.content

        wiki['wiki_config'] = content

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
            'type': 'file',
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

        if not can_edit_wiki(wiki, request.user.username):
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
                from seahub.api2.views import HTTP_447_TOO_MANY_FILES_IN_LIBRARY
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

    def delete(self, request, wiki_id):
        # argument check
        path = request.GET.get('p', None)
        if not path or not path.endswith('.sdoc'):
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        parent_dir_path = os.path.dirname(path)
        if parent_dir_path == '/' or parent_dir_path.rstrip('/') == WIKI_PAGES_DIR:
            error_msg = 'Can not delete root path.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_edit_wiki(wiki, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = wiki.repo_id

        # resource check
        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir_path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check file lock
        try:
            is_locked, locked_by_me = check_file_lock(repo_id, path, request.user.username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if is_locked and not locked_by_me:
            error_msg = _("File is locked")
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        parent_dir_path = parent_dir_path.rstrip('/')
        username = request.user.username
        parent_dir = os.path.dirname(parent_dir_path)
        dir_name = os.path.basename(parent_dir_path)
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
            FileUUIDMap.objects.delete_fileuuidmap_by_path(repo_id, parent_dir_path, file_name, is_dir=False)
            SeadocHistoryName.objects.filter(doc_uuid=file_uuid).delete()
            SeadocDraft.objects.filter(doc_uuid=file_uuid).delete()
            SeadocCommentReply.objects.filter(doc_uuid=file_uuid).delete()
        except Exception as e:
            logger.error(e)

        return Response({'success': True})


class Wiki2DirView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, wiki_id):
        folder_id = request.GET.get('id')
        if not folder_id:
            error_msg = 'folder_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_edit_wiki(wiki, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        config_path = posixpath.join(WIKI_CONFIG_PATH, WIKI_CONFIG_FILE_NAME)
        try:
            repo = seafile_api.get_repo(wiki.repo_id)
        except SearpcError:
            error_msg = _("Internal Server Error")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not repo:
            error_msg = "Wiki library not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo.repo_id, config_path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not file_id:
            error_msg = "Wiki config not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        token = seafile_api.get_fileserver_access_token(repo.repo_id, file_id, 'download', request.user.username, use_onetime=True)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        url = gen_inner_file_get_url(token, WIKI_CONFIG_FILE_NAME)
        resp = requests.get(url)
        wiki_config = json.loads(resp.content)

        navigation = wiki_config.get('navigation', [])

        folder_info = next(filter(lambda t: t['id'] == folder_id, navigation), {})
        pages = wiki_config.get('pages', [])
        id_to_page = {page['id']: page for page in pages}

        page_dir_paths = []
        page_dir_paths = get_page_dir_paths_in_folder(folder_info, id_to_page, page_dir_paths)

        parent_dir = WIKI_PAGES_DIR
        if page_dir_paths:
            try:
                seafile_api.del_file(wiki.repo_id, parent_dir, json.dumps(page_dir_paths), request.user.username)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
