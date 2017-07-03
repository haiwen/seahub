# Copyright (c) 2012-2016 Seafile Ltd.
import re

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import ugettext as _

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.revision_tag.models import Tags, RevisionTags
from seahub.views import check_folder_permission

from seaserv import seafile_api


def check_parameter(func):
    def _decorated(view, request, *args, **kwargs):
        if request.method == "POST":
            repo_id = request.data.get('repo_id', '')
            tag_names = request.data.get('tag_names', '')
            if not tag_names:
                error_msg = _("Tag can not be empty")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            names = [name.strip() for name in tag_names.split(',')]
            tag_names = []
            for name in names:
                if not check_tagname(name):
                    error_msg = _("Tag can only contains letters, numbers, dot, hyphen or underscore")
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
                tag_names.append(name)
        elif request.method == "DELETE":
            repo_id = request.GET.get('repo_id', '')
            tag_name = request.GET.get('tag_name', '')
            if not tag_name:
                error_msg = _("Tag can not be empty")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            if tag_name not in Tags.objects.get_all_tag_name():
                error_msg = "Tag %s not found" % tag_name
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            if not check_tagname(tag_name):
                error_msg = _('Tag can only contains letters, numbers, dot, hyphen or underscore')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not repo_id:
            error_msg = "Repo can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = "Library %s not found" % repo_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if check_folder_permission(request, repo_id, '/') != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return func(view, request, *args, **kwargs)
    return _decorated


def check_tagname(tagname):
    return True if re.match('^[\.\w-]+$', tagname, re.U) else False


class TaggedItemsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    @check_parameter
    def post(self, request):
        repo_id = request.POST.get('repo_id')
        tag_names = request.POST.get('tag_names').split(',')
        repo = seafile_api.get_repo(repo_id)
        if repo.head_commit_id is not None:
            commit_id = repo.head_commit_id
        else:
            commit_id = seafile_api.get_commit_list(repo_id, 0, 1)[0].id
        for name in tag_names:
            revision_tag, created = RevisionTags.objects.create_revision_tag(
                    repo_id, commit_id, name.strip(), request.user.username)
        return Response({"success": True}, status=status.HTTP_200_OK)

    @check_parameter
    def delete(self, request, repo_id, tag_name):
        repo_id = request.GET.get('repo_id')
        tag_name = request.GET.get('tag_name')
        commit_id = None
        if RevisionTags.objects.delete_revision_tag(repo_id, commit_id,
                                                           tag_name):
            return Response({"success": True}, status=status.HTTP_200_OK)
        else:
            return Response({"success": True}, status=status.HTTP_202_ACCEPTED)


class TagNamesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        revision_tags = [tag["tag"].name for tag in RevisionTags.objects.\
                         get_all_tags_by_creator(request.user.username)]
        revision_tags = sorted(revision_tags)

        return Response(revision_tags)
