# Copyright (c) 2012-2016 Seafile Ltd.
import re

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import gettext as _

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.revision_tag.models import RevisionTags
from seahub.views import check_folder_permission

import seaserv
from seaserv import seafile_api


def check_parameter(func):
    def _decorated(view, request, *args, **kwargs):
        if request.method in ["POST", "PUT"]:
            repo_id = request.data.get('repo_id', '')
            commit_id =request.data.get('commit_id', '')
            tag_names = request.data.get('tag_names', None)
        if not repo_id:
            error_msg = "Repo can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = "Library %s not found" % repo_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not commit_id:
            commit_id = repo.head_cmmt_id
        commit = seaserv.get_commit(repo.id, repo.version, commit_id)
        if not commit:
            error_msg = "Commit %s not found" % commit_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if tag_names is None:
            error_msg = "Tag can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        names = []
        if not tag_names.strip():
            if request.method == "POST":
                error_msg = "Tag can not be empty"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        else:
            names = [name.strip() for name in tag_names.split(',')]
            for name in names:
                if not check_tagname(name):
                    error_msg = _("Tag can only contain letters, numbers, dot, hyphen or underscore.")
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if check_folder_permission(request, repo_id, '/') != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return func(view, request, repo_id, commit_id, names, *args, **kwargs)
    return _decorated


def check_tagname(tagname):
    return True if re.match('^[\.\w-]+$', tagname, re.U) else False


class TaggedItemsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    @check_parameter
    def post(self, request, repo_id, commit_id, tag_names):
        revisionTags = []
        for name in tag_names:
            revision_tag, created = RevisionTags.objects.create_revision_tag(
                    repo_id, commit_id, name.strip(), request.user.username)
            revisionTags.append(revision_tag.to_dict())
        return Response({"revisionTags": revisionTags}, status=status.HTTP_200_OK)

    @check_parameter
    def put(self, request, repo_id, commit_id, tag_names):
        revisionTags = []
        RevisionTags.objects.delete_all_revision_tag(repo_id, commit_id)
        for name in tag_names:
            revision_tag, created = RevisionTags.objects.create_revision_tag(
                    repo_id, commit_id, name.strip(), request.user.username)
            revisionTags.append(revision_tag.to_dict())
        return Response({"revisionTags": revisionTags}, status=status.HTTP_200_OK)

    def delete(self, request):
        repo_id = request.GET.get('repo_id', '')
        tag_name = request.GET.get('tag_name', '')
        if not repo_id:
            error_msg = "repo_id can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = "Library %s not found" % repo_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not tag_name:
            error_msg = "tag_name can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if not check_tagname(tag_name):
            error_msg = _("Tag can only contain letters, numbers, dot, hyphen or underscore.")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if check_folder_permission(request, repo_id, '/') != 'rw':
            error_msg = "Permission denied."
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        RevisionTags.objects.delete_revision_tag_by_name(repo_id, tag_name)
        return Response(status=status.HTTP_200_OK)


class TagNamesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        revision_tags = [e.tag.name for e in RevisionTags.objects.\
                         filter(username=request.user.username)]
        revision_tags = sorted(revision_tags)

        return Response(revision_tags)
