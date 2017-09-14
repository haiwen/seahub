# Copyright (c) 2012-2016 Seafile Ltd.

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.utils import is_org_context


class ReposCount(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        email = request.user.username
        if is_org_context(request):
            org_id = request.user.org.org_id
            owned_repos = seafile_api.get_org_owned_repo_list(org_id,
                    email, ret_corrupted=True)
        else:
            owned_repos = seafile_api.get_owned_repo_list(email,
                    ret_corrupted=True)
        count = len(owned_repos)

        return Response({'total': count})
