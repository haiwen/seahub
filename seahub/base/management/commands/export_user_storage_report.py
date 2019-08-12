# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import logging
import posixpath

from django.core.management.base import BaseCommand
from django.utils.translation import ugettext as _

from seaserv import ccnet_api

from seahub.base.templatetags.seahub_tags import email2nickname, \
    email2contact_email

from seahub.views.sysadmin import _populate_user_quota_usage

from seahub.utils.ms_excel import write_xls
from seahub.utils.file_size import byte_to_mb

# Get an instance of a logger
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Export user storage to '../User-Storage.xlsx'."

    def add_arguments(self, parser):

        # Named (optional) arguments
        parser.add_argument(
            '--path',
            help='Folder path to save the file. If not passed, Seafile will save the file in current folder.',
        )

    def handle(self, *args, **options):
        path = options['path']

        db_users = ccnet_api.get_emailusers('DB', -1, -1)
        ldap_import_users = ccnet_api.get_emailusers('LDAPImport', -1, -1)
        all_users = db_users + ldap_import_users

        head = [_("Email"), _("Name"), _("Contact Email"),
                _("Space Usage") + "(MB)", _("Space Quota") + "(MB)"]

        data_list = []
        for user in all_users:

            user_email = user.email
            user_name = email2nickname(user_email)
            user_contact_email = email2contact_email(user_email)

            _populate_user_quota_usage(user)
            space_usage_MB = byte_to_mb(user.space_usage)
            space_quota_MB = byte_to_mb(user.space_quota)

            row = [user_email, user_name, user_contact_email,
                    space_usage_MB, space_quota_MB]

            data_list.append(row)

        excel_name = "User-Storage.xlsx"
        wb = write_xls('users', head, data_list)
        wb.save(posixpath.join(path, excel_name)) if path else wb.save(excel_name)
