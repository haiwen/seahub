# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from django.core.management.base import BaseCommand
from django.utils.translation import gettext as _
from django.utils import translation
from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.utils import IS_EMAIL_CONFIGURED, send_html_email, \
    get_site_name
from seahub.base.models import UserQuotaUsage
from seahub.utils.ccnet_db import CcnetDB

logger = logging.getLogger(__name__)

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
    
    def send_email(self, user_info):
        if not IS_EMAIL_CONFIGURED:
            return

        # save current language
        cur_language = translation.get_language()
        email = user_info.username
        quota_total = user_info.quota
        quota_usage = user_info.usage
        
        # get and active user language
        user_language = self.get_user_language(email)
        translation.activate(user_language)

       
        data = {'email': email, 'quota_total': quota_total, 'quota_usage': quota_usage}
        contact_email = Profile.objects.get_contact_email_by_user(email)

        logger.info('Send email to %s(%s)' % (contact_email, email))

        send_html_email(_(u'Your quota is almost full on %s') % get_site_name(),
                    'user_quota_full.html', data, None, [contact_email])

        # restore current language
        translation.activate(cur_language)
        

    def handle(self, *args, **options):
        ccnet_db = CcnetDB()
        alert_users = UserQuotaUsage.objects.get_quota_alert_users()
        if not alert_users:
            return
        
        alert_users_email_list = [u.username for u in alert_users]

        available_alert_user_email_list = ccnet_db.get_active_users_by_user_list(alert_users_email_list)
        if not available_alert_user_email_list:
            return
        available_alert_user_email_map = {u.get('email'): u for u in alert_users if u.get('email') in available_alert_user_email_list}
        user_obj_email_list = available_alert_user_email_map.keys()
        email = options.get('email', None)
        
        if email:
            try:
                if email not in available_alert_user_email_list:
                    return
                User.objects.get(email=email)
                user_info = available_alert_user_email_map.get(email)
                self.send_email(user_info)
                print("Done")
            except User.DoesNotExist:
                print('User %s not found' % email)
                
            
        else:
            for email in user_obj_email_list:
                user_info = available_alert_user_email_map.get(email)
                self.send_email(user_info)

            print("Done")
