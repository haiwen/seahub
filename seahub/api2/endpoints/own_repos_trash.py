import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.template.defaultfilters import filesizeformat
from seaserv import seafile_api

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.base import APIView
from seahub.base.templatetags.seahub_tags import translate_seahub_time

logger = logging.getLogger(__name__)


class OwnReposTrash(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        get the repos trash of owner
        """
        trashs_json = []
        email = request.user.username

        trashs_repos = seafile_api.get_trash_repos_by_owner(email)
        for r in trashs_repos:
            trash = {
                    "id": r.repo_id,
                    "owner": email,
                    "name": r.repo_name,
                    "org_id": r.org_id,
                    "head_id": r.head_id,
                    "del_time": r.del_time,
                    "del_time_relative": translate_seahub_time(r.del_time),
                    "size": r.size,
                    "size_formatted": filesizeformat(r.size),
            }
            trashs_json.append(trash)
        return Response(trashs_json)
