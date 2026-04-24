# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

from seahub.institutions.models import InstitutionAdmin


class InstitutionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not getattr(settings, 'MULTI_INSTITUTION', False):
            return self.get_response(request)

        username = request.user.username

        # todo: record to session to avoid database query

        try:
            inst_admin = InstitutionAdmin.objects.get(user=username)
        except InstitutionAdmin.DoesNotExist:
            request.user.inst_admin = False
            return self.get_response(request)

        request.user.institution = inst_admin.institution
        request.user.inst_admin = True

        return self.get_response(request)
