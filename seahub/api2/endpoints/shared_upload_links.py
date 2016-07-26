# Copyright (c) 2012-2016 Seafile Ltd.
import json
import os

from django.http import HttpResponse
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.share.models import UploadLinkShare
from seahub.utils import gen_shared_upload_link
from seahub.utils.timeutils import datetime_to_isoformat_timestr

json_content_type = 'application/json; charset=utf-8'

class SharedUploadLinksView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        username = request.user.username

        uploadlinks = UploadLinkShare.objects.filter(username=username)
        p_uploadlinks = []
        for link in uploadlinks:
            r = seafile_api.get_repo(link.repo_id)
            if not r:
                link.delete()
                continue

            if seafile_api.get_dir_id_by_path(r.id, link.path) is None:
                link.delete()
                continue

            if link.path != '/':
                link.dir_name = os.path.basename(link.path.rstrip('/'))
            else:
                link.dir_name = link.path

            link.shared_link = gen_shared_upload_link(link.token)
            link.repo = r

            if link.expire_date:
                expire_date = datetime_to_isoformat_timestr(link.expire_date)
            else:
                expire_date = ""

            p_uploadlinks.append({
                "username": link.username,
                "repo_id": link.repo_id,
                "path": link.path,
                "token": link.token,
                "ctime": datetime_to_isoformat_timestr(link.ctime),
                "view_cnt": link.view_cnt,
                "expire_date": expire_date,
            })

        return HttpResponse(json.dumps(p_uploadlinks),
                            status=200, content_type=json_content_type)
