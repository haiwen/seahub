# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import os
import logging

from django.conf import settings as dj_settings
from django.core.management.base import BaseCommand
from django.core.urlresolvers import reverse
from django.utils import translation
from django.utils.translation import ugettext as _
import seaserv
from seaserv import seafile_api

from seahub.profile.models import Profile
from seahub.utils.mail import send_html_email_with_dj_template, MAIL_PRIORITY
from seahub.utils import get_site_name

# Get an instance of a logger
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Send Email notifications to admins if there are virus files detected .'
    label = "notifications_notify_admins_on_virus"

    def add_arguments(self, parser):
        parser.add_argument('repo_file', nargs='+', type=str)

    def get_user_language(self, username):
        return Profile.objects.get_user_language(username)

    def handle(self, *args, **options):
        self.email_admins()
        self.email_mail_list()

        for repo_file in options['repo_file']:
            self.email_repo_owner(repo_file)

    def email_admins(self):
        db_users = seaserv.get_emailusers('DB', -1, -1)
        ldpa_imported_users = seaserv.get_emailusers('LDAPImport', -1, -1)

        admins = []
        for user in db_users + ldpa_imported_users:
            if user.is_staff:
                admins.append(user)

        for u in admins:
            # save current language
            cur_language = translation.get_language()

            # get and active user language
            user_language = self.get_user_language(u.email)
            translation.activate(user_language)

            send_html_email_with_dj_template(
                u.email, dj_template='notifications/notify_virus.html',
                subject=_('Virus detected on %s') % get_site_name(),
                priority=MAIL_PRIORITY.now
            )

            # restore current language
            translation.activate(cur_language)

    def email_mail_list(self):
        try:
            notify_list = dj_settings.VIRUS_SCAN_NOTIFY_LIST
        except AttributeError:
            return

        for mail in notify_list:
            send_html_email_with_dj_template(
                mail, dj_template='notifications/notify_virus.html',
                subject=_('Virus detected on %s') % get_site_name(),
                priority=MAIL_PRIORITY.now
            )

    def email_repo_owner(self, repo_file):
        repo_id, file_path = repo_file.split(':', 1)
        owner = seafile_api.get_repo_owner(repo_id)
        if not owner:
            return

        # save current language
        cur_language = translation.get_language()

        # get and active user language
        user_language = self.get_user_language(owner)
        translation.activate(user_language)

        contact_email = Profile.objects.get_contact_email_by_user(owner)
        send_html_email_with_dj_template(
            contact_email, dj_template='notifications/notify_virus.html',
            context={'owner': owner,
                     'file_url': reverse('view_lib_file',
                                         args=[repo_id, file_path]),
                     'file_name': os.path.basename(file_path),
                 },
            subject=_('Virus detected on %s') % get_site_name(),
            priority=MAIL_PRIORITY.now
        )

        # restore current language
        translation.activate(cur_language)
