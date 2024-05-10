# Copyright (c) 2012-2016 Seafile Ltd.
import json
import logging
import requests
import posixpath

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api, edit_repo
from pysearpc import SearpcError
from django.db import IntegrityError
from django.db.models import Count
from django.http import HttpResponse
from django.utils.translation import gettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.wiki.models import Wiki, DuplicateWikiNameError
from seahub.wiki.utils import is_valid_wiki_name, slugfy_wiki_name
from seahub.utils import is_org_context, get_user_repos, gen_inner_file_get_url, gen_file_upload_url
from seahub.utils.repo import is_group_repo_staff, is_repo_owner
from seahub.views import check_folder_permission
from seahub.share.utils import is_repo_admin
from seahub.share.models import FileShare


WIKI_CONFIG_PATH = '_Internal/Wiki'
WIKI_CONFIG_FILE_NAME = 'index.json'


logger = logging.getLogger(__name__)
HTTP_520_OPERATION_FAILED = 520

class WikisView(APIView):
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
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to create library.')

        wiki_name = request.data.get("name", None)
        if not wiki_name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'wiki name is required.')

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        try:
            wiki = Wiki.objects.add(wiki_name=wiki_name, username=username, org_id=org_id, permission='public', version='v2')
        except DuplicateWikiNameError:
            msg = _('%s is taken by others, please try another name.') % wiki_name
            return api_error(status.HTTP_400_BAD_REQUEST, msg)
        except IntegrityError:
            msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, msg)

        repo_id = wiki.repo_id

        # create home page if not exist
        page_name = "home.md"
        if not seafile_api.get_file_id_by_path(repo_id, "/" + page_name):
            try:
                seafile_api.post_empty_file(repo_id, '/', page_name, username)
            except Exception as e:
                if str(e) == 'Too many files in library.':
                    error_msg = _("The number of files in library exceeds the limit")
                    from seahub.api2.views import HTTP_442_TOO_MANY_FILES_IN_LIBRARY
                    return api_error(HTTP_442_TOO_MANY_FILES_IN_LIBRARY, error_msg)
                else:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        fs = FileShare.objects.get_dir_link_by_path(username, repo_id, '/')
        if not fs:
            fs = FileShare.objects.create_dir_link(username, repo_id, '/',
                    permission='view_download', org_id=org_id)

        return Response(wiki.to_dict())


class WikiView(APIView):
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

        Wiki.objects.filter(id=wiki_id).delete()

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

    def put(self, request, wiki_id):
        """Edit a wiki permission
        """
        username = request.user.username

        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if wiki.username != username:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        permission = request.data.get('permission', '').lower()
        if permission not in [x[0] for x in Wiki.PERM_CHOICES]:
            msg = 'Permission invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, msg)

        wiki.permission = permission
        wiki.save()
        return Response(wiki.to_dict())

    def post(self, request, wiki_id):
        """Rename a Wiki
        """
        username = request.user.username

        try:
            wiki = Wiki.objects.get(wiki_id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = _("Wiki not found.")
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if wiki.username != username:
            error_msg = _("Permission denied.")
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        wiki_name = request.POST.get('wiki_name', '')
        if not wiki_name:
            error_msg = _('Name is required.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_valid_wiki_name(wiki_name):
            msg = _('Name can only contain letters, numbers, blank, hyphen or underscore.')
            return api_error(status.HTTP_400_BAD_REQUEST, msg)

        wiki_slug = slugfy_wiki_name(wiki_name)

        wiki_exist = Wiki.objects.filter(slug=wiki_slug)
        if wiki_exist.exists():
            msg = _('%s is taken by others, please try another name.') % wiki_name
            return api_error(status.HTTP_400_BAD_REQUEST, msg)

        if edit_repo(wiki.repo_id, wiki_name, '', username):
            wiki.slug = wiki_slug
            wiki.name = wiki_name
            wiki.save()
        else:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                             "Unable to rename wiki")

        return Response(wiki.to_dict())


class WikiConfigView(APIView):
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

        if wiki.username != username:
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

        if not wiki.has_read_perm(request):
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
