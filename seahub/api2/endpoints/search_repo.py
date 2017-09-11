# Copyright (c) 2012-2016 Seafile Ltd.

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.template.defaultfilters import filesizeformat

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.utils import is_org_context
from seahub.utils.timeutils import timestamp_to_isoformat_timestr


class SearchRepo(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        q = request.GET.get('q', '')
        if not q:
            error_msg = 'keywords can not be empty'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        email = request.user.username
        if is_org_context(request):
            org_id = request.user.org.org_id
            owned_repos = seafile_api.get_org_owned_repo_list(org_id, 
                                                              email, 
                                                              ret_corrupted=True)
        else:
            owned_repos = seafile_api.get_owned_repo_list(email, 
                                                          ret_corrupted=True)
        owned_repos.sort(lambda x, y: cmp(y.last_modify, x.last_modify))
        repos = []
        for r in owned_repos:
            # do not return virtual repos
            if r.is_virtual:
                continue

            if q.lower() in r.name.lower():
                repo = {
                    "type": "repo",
                    "id": r.id,
                    "owner": email,
                    "name": r.name,
                    "mtime": r.last_modify,
                    "mtime_relative": timestamp_to_isoformat_timestr(r.last_modify),
                    "size": r.size,
                    "size_formatted": filesizeformat(r.size),
                    "encrypted": r.encrypted,
                    "permission": 'rw',  # Always have read-write permission to owned repo
                    "virtual": False,
                    "root": '',
                    "head_commit_id": r.head_cmmt_id,
                    "version": r.version,
                }
                repos.append(repo)

        return Response({'repos': repos})
