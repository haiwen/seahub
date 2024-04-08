# Copyright (c) 2012-2016 Seafile Ltd.

from django.core.management.base import BaseCommand
from django.utils.translation import gettext as _
from django.utils import translation

from seaserv import ccnet_api, seafile_api

from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.utils import IS_EMAIL_CONFIGURED, send_html_email, \
        get_site_name


class Command(BaseCommand):

    help = "Used to send notice email when user's quota is almost full."

    def __init__(self, *args, **kwargs):

        super(Command, self).__init__(*args, **kwargs)

    def add_arguments(self, parser):

        parser.add_argument(
            '--email',
            help="Only check this user's quota."
        )

    def get_user_language(self, username):
        return Profile.objects.get_user_language(username)

    def send_email(self, email):

        # save current language
        cur_language = translation.get_language()

        # get and active user language
        user_language = self.get_user_language(email)
        translation.activate(user_language)

        orgs = ccnet_api.get_orgs_by_user(email)
        if orgs:
            org_id = orgs[0].org_id
            quota_usage = seafile_api.get_org_user_quota_usage(org_id, email)
            quota_total = seafile_api.get_org_user_quota(org_id, email)
        else:
            quota_usage = seafile_api.get_user_self_usage(email)
            quota_total = seafile_api.get_user_quota(email)

        if IS_EMAIL_CONFIGURED and quota_total > 0 and quota_usage/quota_total > 0.9:

            data = {'email': email, 'quota_total': quota_total, 'quota_usage': quota_usage}
            contact_email = Profile.objects.get_contact_email_by_user(email)

            print('Send email to %s(%s)' % (contact_email, email))

            send_html_email(_(u'Your quota is almost full on %s') % get_site_name(),
                        'user_quota_full.html', data, None, [contact_email])

        # restore current language
        translation.activate(cur_language)

    def handle(self, *args, **options):

        email = options.get('email', None)
        if email:
            try:
                User.objects.get(email=email)

                self.send_email(email)
            except User.DoesNotExist:
                print('User %s not found' % email)
        else:
            user_obj_list = ccnet_api.get_emailusers('DB', -1, -1) + \
                            ccnet_api.get_emailusers('LDAPImport', -1, -1)
            for user in user_obj_list:
                self.send_email(user.email)

        print("Done")
