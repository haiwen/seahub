# Copyright (c) 2012-2016 Seafile Ltd.
import json
import logging

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
from seahub.utils import is_org_context, get_user_repos
from seahub.utils.repo import is_group_repo_staff, is_repo_owner
from seahub.views import check_folder_permission
from seahub.share.utils import is_repo_admin
from seahub.share.models import FileShare

logger = logging.getLogger(__name__)


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
        ret = [x.to_dict() for x in Wiki.objects.filter(
            repo_id__in=filter_repo_ids)]

        return Response({'data': ret})

    def post(self, request, format=None):
        """Add a new wiki.
        """
        username = request.user.username

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        repo_id = request.POST.get('repo_id', '')
        if not repo_id:
            msg = 'Repo id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check perm
        if not (request.user.permissions.can_publish_repo() and request.user.permissions.can_generate_share_link()):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        is_owner = is_repo_owner(request, repo_id, username)

        if not is_owner:
            repo_admin = is_repo_admin(username, repo_id)

            if not repo_admin:
                is_group_repo_admin = is_group_repo_staff(request, repo_id, username)

                if not is_group_repo_admin:
                    error_msg = _('Permission denied.')
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            wiki = Wiki.objects.add(wiki_name=repo.repo_name, username=username,
                    repo_id=repo.repo_id, org_id=org_id, permission='public')
        except DuplicateWikiNameError:
            msg = _('%s is taken by others, please try another name.') % repo.repo_name
            return api_error(status.HTTP_400_BAD_REQUEST, msg)
        except IntegrityError:
            msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, msg)

        # create home page if not exist
        page_name = "home.md"
        if not seafile_api.get_file_id_by_path(repo_id, "/" + page_name):
            try:
                seafile_api.post_empty_file(repo_id, '/', page_name, username)
            except SearpcError as e:
                logger.error(e)
                msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, msg)

        fs = FileShare.objects.get_dir_link_by_path(username, repo_id, '/')
        if not fs:
            fs = FileShare.objects.create_dir_link(username, repo_id, '/',
                    permission='view_download', org_id=org_id)

        return Response(wiki.to_dict())


class WikiView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, slug):
        """Delete a wiki.
        """
        username = request.user.username
        try:
            owner = Wiki.objects.get(slug=slug).username
        except Wiki.DoesNotExist:
            error_msg = 'Wiki not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        if owner != username:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        Wiki.objects.filter(slug=slug).delete()

        return Response()

    def put(self, request, slug):
        """Edit a wiki permission
        """
        username = request.user.username

        try:
            wiki = Wiki.objects.get(slug=slug)
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

    def post(self, request, slug):
        """Rename a Wiki
        """
        username = request.user.username

        try:
            wiki = Wiki.objects.get(slug=slug)
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
