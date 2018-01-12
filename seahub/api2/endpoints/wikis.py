# Copyright (c) 2012-2016 Seafile Ltd.
import json
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api
from pysearpc import SearpcError
from django.core.urlresolvers import reverse
from django.db import IntegrityError
from django.db.models import Count
from django.http import HttpResponse
from django.utils.translation import ugettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.wiki.models import Wiki, DuplicateWikiNameError
from seahub.wiki.utils import is_valid_wiki_name
from seahub.utils import is_org_context

logger = logging.getLogger(__name__)


class WikisView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        """List all wikis.
        """
        username = request.user.username
        ret = [x.to_dict() for x in Wiki.objects.filter(username=username)]

        return Response({'data': ret})

    def post(self, request, format=None):
        """Add a new wiki.
        """
        result = {}
        content_type = 'application/json; charset=utf-8'
        name = request.POST.get('name', '')
        if not name:
            return api_error(status.HTTP_400_BAD_REQUEST, _('Name is required.'))

        if not is_valid_wiki_name(name):
            msg = _('Name can only contain letters, numbers, blank, hyphen or underscore.')
            return api_error(status.HTTP_400_BAD_REQUEST, msg)

        permission = request.POST.get('permission', '').lower()
        if permission not in [x[0] for x in Wiki.PERM_CHOICES]:
            msg = 'Permission invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, msg)

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        username = request.user.username
        try:
            wiki = Wiki.objects.add(name, permission, username, org_id)
        except DuplicateWikiNameError:
            result['error'] = _('%s is taken by others, please try another name.') % name
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)
        except IntegrityError:
            result['error'] = 'Internal Server Error'
            return HttpResponse(json.dumps(result), status=500,
                                content_type=content_type)

        return Response(wiki.to_dict())
