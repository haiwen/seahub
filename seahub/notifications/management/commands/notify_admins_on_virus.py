# encoding: utf-8
import logging

from django.core.management.base import BaseCommand
from django.utils import translation
from django.utils.translation import ugettext as _
import seaserv

from seahub.profile.models import Profile
import seahub.settings as settings
from seahub.utils.mail import send_html_email_with_dj_template

# Get an instance of a logger
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Send Email notifications to admins if there are virus files detected .'
    label = "notifications_notify_admins_on_virus"

    def get_user_language(self, username):
        return Profile.objects.get_user_language(username)

    def handle(self, *args, **options):
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
                subject=_('Virus detected on %s') % settings.SITE_NAME,
                backend='post_office'
            )

            # restore current language
            translation.activate(cur_language)
