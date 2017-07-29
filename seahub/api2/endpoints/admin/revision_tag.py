# Copyright (c) 2012-2016 Seafile Ltd.
import re

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import ugettext as _

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.base.accounts import User
from seahub.revision_tag.models import RevisionTags

from seaserv import seafile_api


def check_tagname(tag_name):
    return True if re.match('^[\.\w-]+$', tag_name, re.U) else False


class AdminTaggedItemsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        normal = True
        user = request.GET.get('user', None)
        if user is not None:
            if not normal:
                error_msg = "unsupported operation"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            normal = False
            try:
                User.objects.get(email=user)
            except User.DoesNotExist:
                error_msg = "User %s not found" % user
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            revision_tags = RevisionTags.objects.get_all_tags_by_creator(user)

        repo_id = request.GET.get('repo_id', None)
        if repo_id is not None:
            if not normal:
                error_msg = "unsupported operation"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            normal = False
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                error_msg = "Library %s not found" % repo_id
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            revision_tags = RevisionTags.objects.get_all_tags_by_repo(repo_id)

        tag_name = request.GET.get('tag_name', None)
        if tag_name is not None:
            if not normal:
                error_msg = "unsupported operation"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            normal = False
            if not check_tagname(tag_name):
                error_msg = "Tag %s invalid" % tag_name
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            revision_tags = RevisionTags.objects.get_all_tags_by_tagname(tag_name)

        tag_contains = request.GET.get('tag_contains', None)
        if tag_contains is not None:
            if not normal:
                error_msg = "unsupported operation"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            normal = False
            if not check_tagname(tag_contains):
                error_msg = "key word %s invalid" % tag_contains
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            revision_tags = RevisionTags.objects.get_all_tags_by_key(tag_contains)

        if normal:
            revision_tags = RevisionTags.objects.all()

        revision_tags = sorted(revision_tags, key=lambda revision_tags: revision_tags['tag'])
        return Response([revision_tag.to_dict() for revision_tag in revision_tags])
