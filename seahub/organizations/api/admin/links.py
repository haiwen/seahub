# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import os

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from seaserv import ccnet_api, seafile_api

from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.share.models import FileShare, OrgFileShare

from seahub.organizations.api.permissions import IsOrgAdmin

logger = logging.getLogger(__name__)


class OrgAdminLinks(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdmin)

    def get(self, request):
        """List organization public links
        """
        # Make sure page request is an int. If not, deliver first page.

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        offset = per_page * (current_page - 1)
        limit = per_page + 1
        org_id = request.user.org.org_id

        ofs = OrgFileShare.objects.filter(org_id=org_id)[offset:offset + limit]
        publinks = [ x.file_share for x in ofs ]

        if len(publinks) == per_page + 1:
            page_next = True
        else:
            page_next = False

        link_list = []

        for l in publinks:
            link = {}
            link['id'] = l.id
            link['owner_name'] = email2nickname(l.username)
            link['owner_email'] = l.username
            link['owner_contact_email'] = email2contact_email(l.username)
            link['created_time'] = datetime_to_isoformat_timestr(l.ctime)
            link['view_count'] = l.view_cnt
            link['token'] = l.token

            if l.is_file_share_link():
                link['name'] = os.path.basename(l.path)
            else:
                link['name'] = os.path.dirname(l.path)

            link_list.append(link)

        return Response({
                'link_list': link_list,
                'page': current_page,
                'page_next': page_next,
            })


class OrgAdminLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdmin)

    def delete(self, request, token):
        org_id = request.user.org.org_id
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            fs = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'File share %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if len(OrgFileShare.objects.filter(org_id=org_id, file_share=fs)) > 0:
            fs.delete()

        return Response({'success': True})
