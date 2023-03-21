# Copyright (c) 2012-2016 Seafile Ltd.

from django.core.management.base import BaseCommand
from seaserv import seafile_api
from seahub.role_permissions.settings import ENABLED_ROLE_PERMISSIONS


class Command(BaseCommand):

    help = "Set upload/download rate limit via user role."

    def handle(self, *args, **options):

        for role, permissions in ENABLED_ROLE_PERMISSIONS.items():

            upload_rate_limit = permissions.get('upload_rate_limit', 0)
            if upload_rate_limit >= 0:
                seafile_api.set_role_upload_rate_limit(role, upload_rate_limit * 1000)

            download_rate_limit = permissions.get('download_rate_limit', 0)
            if download_rate_limit >= 0:
                seafile_api.set_role_download_rate_limit(role, download_rate_limit * 1000)

        print("Done")
