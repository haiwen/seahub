# Copyright (c) 2012-2016 Seafile Ltd.

import os
import logging
import urllib2

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import (
    IsAuthenticated, IsAuthenticatedOrReadOnly)
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api, get_file_id_by_path
from pysearpc import SearpcError
from django.utils.translation import ugettext as _

from seahub.views import check_folder_permission
from seahub.views.file import send_file_access_msg
from seahub.api2.views import get_dir_file_recursively
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.wiki.models import Wiki, WikiPageMissing
from seahub.wiki.utils import (clean_page_name, get_wiki_pages, get_inner_file_url,
                               get_wiki_dirent, get_wiki_page_object, get_wiki_dirs_by_path)
from seahub.utils import gen_file_get_url
from seahub.base.templatetags.seahub_tags import email2contact_email, email2nickname

logger = logging.getLogger(__name__)

HTTP_520_OPERATION_FAILED = 520

class WikiPagesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticatedOrReadOnly, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, slug):
        """List all pages in a wiki.
        """
        try:
            wiki = Wiki.objects.get(slug=slug)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # perm check
        if not wiki.has_read_perm(request.user):
            error_msg = "Permission denied"
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = "Internal Server Error"
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        pages = get_wiki_pages(repo)
        wiki_pages_object = []
        for _, page_name in pages.iteritems():
            wiki_page_object = get_wiki_page_object(wiki, page_name)
            wiki_pages_object.append(wiki_page_object)

        # sort pages by name
        wiki_pages_object.sort(lambda x, y: cmp(x['name'].lower(),
                                                y['name'].lower()))

        return Response({
                "data": wiki_pages_object
                })

    def post(self, request, slug):
        """ Add a page in a wiki
        """
        try:
            wiki = Wiki.objects.get(slug=slug)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # perm check
        username = request.user.username
        if wiki.username != username:
            error_msg = _('Permission denied.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        page_name = request.POST.get('name', '')
        if not page_name:
            error_msg = 'name invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        page_name = clean_page_name(page_name)
        filename = page_name + ".md"
        filepath = "/" + page_name + ".md"

        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = _("Internal Server Error")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # check whether file exists
        if get_file_id_by_path(repo.id, filepath):
            error_msg = _('Page "%s" already exists.') % filename
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            seafile_api.post_empty_file(repo.id, '/',
                                        filename, request.user.username)
        except SearpcError as e:
            logger.error(e)
            error_msg = _('Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        wiki_page_object = get_wiki_page_object(wiki, page_name)

        return Response(wiki_page_object)


class WikiPageView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticatedOrReadOnly, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, slug, page_name="home"):
        """Get content of a wiki
        """
        try:
            wiki = Wiki.objects.get(slug=slug)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # perm check
        if not wiki.has_read_perm(request.user):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        page_name = clean_page_name(page_name)

        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = _("Internal Server Error")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            wiki_dirent = get_wiki_dirent(repo.id, page_name)
        except WikiPageMissing:
            error_msg = _("Page %s not found.") % page_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        url = get_inner_file_url(repo, wiki_dirent.obj_id, wiki_dirent.obj_name)
        file_response = urllib2.urlopen(url)
        content = file_response.read()

        wiki_page_object = get_wiki_page_object(wiki, page_name)

        return Response({
            "meta": wiki_page_object,
            "content": content
        })

    def delete(self, request, slug, page_name):
        """Delete a page in a wiki
        """
        try:
            wiki = Wiki.objects.get(slug=slug)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        if wiki.username != username:
            error_msg = _('Permission denied.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = _("Internal Server Error")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        file_name = page_name + ".md"

        try:
            seafile_api.del_file(repo.id, '/',
                                 file_name, request.user.username)
        except SearpcError as e:
            logger.error(e)
            error_msg = _('Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response()

class WikiPagesDirView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticatedOrReadOnly, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, slug):
        """List all dir files in a wiki.
        """
        try:
            wiki = Wiki.objects.get(slug=slug)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get("p", '')
        if not path:
            error_msg = "Folder not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # perm check
        if not wiki.check_access_wiki(request):
            error_msg = "Permission denied"
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = "Internal Server Error"
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        dir_id = seafile_api.get_dir_id_by_path(repo.repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        all_dirs = get_wiki_dirs_by_path(repo.repo_id, path, [])

        return Response({
            "dir_file_list": all_dirs
        })


class WikiPageContentView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticatedOrReadOnly, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, slug):
        """Get content of a wiki
        """
        path = request.GET.get('p', '/')
        try:
            wiki = Wiki.objects.get(slug=slug)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # perm check
        if not wiki.check_access_wiki(request):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        if request.user.username:
            parent_dir = os.path.dirname(path)
            permission = check_folder_permission(request, wiki.repo_id, parent_dir)
        else:
            permission = 'r'

        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = _("Internal Server Error")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        file_id = None
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

        file_name = os.path.basename(path)
        token = seafile_api.get_fileserver_access_token(repo.repo_id,
                file_id, 'download', request.user.username, 'False')

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        url = gen_file_get_url(token, file_name)
        file_response = urllib2.urlopen(url)
        content = file_response.read()
        
        try:
            dirent = seafile_api.get_dirent_by_path(repo.repo_id, path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
            else:
                latest_contributor, last_modified = None, 0
        except SearpcError as e:
            logger.error(e)
            latest_contributor, last_modified = None, 0

        return Response({
            "content": content,
            "latest_contributor": email2nickname(latest_contributor),
            "last_modified": last_modified,
            "permission": permission,
            })
