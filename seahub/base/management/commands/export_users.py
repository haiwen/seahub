# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import logging

from django.core.management.base import BaseCommand
from django.utils.translation import gettext as _

from seaserv import seafile_api, ccnet_api

from seahub.utils import is_pro_version
from seahub.utils.file_size import get_file_size_unit
from seahub.utils.ms_excel import write_xls
from seahub.constants import GUEST_USER, DEFAULT_USER
from seahub.base.models import UserLastLogin
from seahub.base.templatetags.seahub_tags import tsstr_sec
from seahub.profile.models import Profile

# Get an instance of a logger
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Export users to '../users.xlsx'."
    label = "views_export_users"

    def handle(self, *args, **options):
        self.stdout.write("Export users to '../users.xlsx'.")

        try:
            users = ccnet_api.get_emailusers('DB', -1, -1) + \
                    ccnet_api.get_emailusers('LDAPImport', -1, -1)
        except Exception as e:
            self.stdout.write('Error: ' + str(e))
            return

        if is_pro_version():
            is_pro = True
        else:
            is_pro = False

        if is_pro:
            head = [_("Email"), _("Name"), _("Contact Email"), _("Status"), _("Role"),
                    _("Space Usage") + "(MB)", _("Space Quota") + "(MB)",
                    _("Create At"), _("Last Login"), _("Admin"), _("LDAP(imported)"),]
        else:
            head = [_("Email"), _("Name"), _("Contact Email"), _("Status"),
                    _("Space Usage") + "(MB)", _("Space Quota") + "(MB)",
                    _("Create At"), _("Last Login"), _("Admin"), _("LDAP(imported)"),]

        # only operate 100 users for every `for` loop
        looped = 0
        limit = 100
        data_list = []

        while looped < len(users):

            current_users = users[looped:looped+limit]

            last_logins = UserLastLogin.objects.filter(username__in=[x.email \
                    for x in current_users])
            user_profiles = Profile.objects.filter(user__in=[x.email \
                    for x in current_users])

            for user in current_users:
                # populate name and contact email
                user.contact_email = ''
                user.name = ''
                for profile in user_profiles:
                    if profile.user == user.email:
                        user.contact_email = profile.contact_email
                        user.name = profile.nickname

                # populate space usage and quota
                MB = get_file_size_unit('MB')

                # populate user quota usage
                orgs = ccnet_api.get_orgs_by_user(user.email)
                try:
                    if orgs:
                        user.org = orgs[0]
                        org_id = user.org.org_id
                        user.space_usage = seafile_api.get_org_user_quota_usage(org_id, user.email)
                        user.space_quota = seafile_api.get_org_user_quota(org_id, user.email)
                    else:
                        user.space_usage = seafile_api.get_user_self_usage(user.email)
                        user.space_quota = seafile_api.get_user_quota(user.email)
                except Exception as e:
                    self.stdout.write('Debug: ' + str(e))
                    user.space_usage = -1
                    user.space_quota = -1

                if user.space_usage > 0:
                    try:
                        space_usage_MB = round(float(user.space_usage) / MB, 2)
                    except Exception as e:
                        self.stdout.write('Debug: ' + str(e))
                        space_usage_MB = '--'
                else:
                    space_usage_MB = ''

                if user.space_quota > 0:
                    try:
                        space_quota_MB = round(float(user.space_quota) / MB, 2)
                    except Exception as e:
                        self.stdout.write('Debug: ' + str(e))
                        space_quota_MB = '--'
                else:
                    space_quota_MB = ''

                # populate user last login time
                user.last_login = None
                for last_login in last_logins:
                    if last_login.username == user.email:
                        user.last_login = last_login.last_login

                if user.is_active:
                    status = _('Active')
                else:
                    status = _('Inactive')

                create_at = tsstr_sec(user.ctime) if user.ctime else ''
                last_login = user.last_login.strftime("%Y-%m-%d %H:%M:%S") if \
                    user.last_login else ''

                is_admin = _('Yes') if user.is_staff else ''
                ldap_import = _('Yes') if user.source == 'LDAPImport' else ''

                if is_pro:
                    if user.role:
                        if user.role == GUEST_USER:
                            role = _('Guest')
                        elif user.role == DEFAULT_USER:
                            role = _('Default')
                        else:
                            role = user.role
                    else:
                        role = _('Default')

                    row = [user.email, user.name, user.contact_email, status, role,
                            space_usage_MB, space_quota_MB, create_at,
                            last_login, is_admin, ldap_import]
                else:
                    row = [user.email, user.name, user.contact_email, status,
                            space_usage_MB, space_quota_MB, create_at,
                            last_login, is_admin, ldap_import]

                data_list.append(row)

            # update `looped` value when `for` loop finished
            looped += limit

        wb = write_xls('users', head, data_list)
        if not wb:
            self.stdout.write('Error: please check the log.')
            return

        wb.save('../users.xlsx')
        self.stdout.write('Done.\n')
