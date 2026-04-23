# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin

from seahub.institutions.models import InstitutionAdmin


class InstitutionMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if not getattr(settings, 'MULTI_INSTITUTION', False):
            return None

        username = request.user.username

        # todo: record to session to avoid database query

        try:
            inst_admin = InstitutionAdmin.objects.get(user=username)
        except InstitutionAdmin.DoesNotExist:
            request.user.inst_admin = False
            return None

        request.user.institution = inst_admin.institution
        request.user.inst_admin = True
        return None
