# Copyright (c) 2012-2016 Seafile Ltd.
import datetime
import logging
from django.core.management.base import BaseCommand
from django.utils.translation import gettext as _
from django.utils import translation

from seaserv import ccnet_api, seafile_api

from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.utils import IS_EMAIL_CONFIGURED, send_html_email, \
    get_site_name, SeafileDB
from seahub.base.models import QuotaAlertEmailRecord
from seahub.settings import QUOTA_ALERT_DAY_INTERVAL
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
        parser.add_argument(
            '-a', '--auto',
            type=str, 
            choices=['true', 'false'], 
            default='false',
        )

    def get_user_language(self, username):
        return Profile.objects.get_user_language(username)
    
    def print_msg(self, msg, msg_type='info', record=False):
        if not record:
            self.stdout.write('[%s] [%s]: %s' % (str(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')), msg_type.upper(), msg))
            return
        if msg_type == 'info':
            logger.info(msg)
        else:
            logger.error(msg)

    def send_email(self, user_info, record=False):
        if not IS_EMAIL_CONFIGURED:
            return

        # save current language
        cur_language = translation.get_language()
        email = user_info.get('email')
        quota_total = user_info.get('quota_total')
        quota_usage = user_info.get('quota_usage')

        # get and active user language
        user_language = self.get_user_language(email)
        translation.activate(user_language)

       
        data = {'email': email, 'quota_total': quota_total, 'quota_usage': quota_usage}
        contact_email = Profile.objects.get_contact_email_by_user(email)

        self.print_msg('Send email to %s(%s)' % (contact_email, email), record=record)

        send_html_email(_(u'Your quota is almost full on %s') % get_site_name(),
                    'user_quota_full.html', data, None, [contact_email])

        if record:
            QuotaAlertEmailRecord.objects.create_or_update(email)

        # restore current language
        translation.activate(cur_language)

    def handle(self, *args, **options):
        seafile_db = SeafileDB()
        ccnet_db = CcnetDB()
        alert_users = seafile_db.get_users_by_quota_alert()
        if not alert_users:
            return
        
        alert_users_email_list = [u.get('email') for u in alert_users]

        available_alert_user_email_list = ccnet_db.get_active_users_by_user_list(alert_users_email_list)
        if not available_alert_user_email_list:
            return
        available_alert_user_email_map = {u.get('email'): u for u in alert_users if u.get('email') in available_alert_user_email_list}
        user_obj_email_list = available_alert_user_email_map.keys()
        email = options.get('email', None)
        auto_run = options.get('auto', None)
        if email:
            try:
                if email not in available_alert_user_email_list:
                    return
                User.objects.get(email=email)
                self.send_email(email)
                self.print_msg("Done")
            except User.DoesNotExist:
                self.print_msg('User %s not found' % email)

        elif auto_run == 'true':
            if QUOTA_ALERT_DAY_INTERVAL <= 0:
                # ignore the users which already have records
                records = QuotaAlertEmailRecord.objects.filter(email__in=user_obj_email_list)
            else:
                # ignore the users which have records within n days
                records = QuotaAlertEmailRecord.objects.get_records_within_days(days=QUOTA_ALERT_DAY_INTERVAL,
                                                                                emails=user_obj_email_list)
    
            email_records = [r.email for r in records]
            email_should_handle = list(set(user_obj_email_list) - set(email_records))
            for email in email_should_handle:
                user_info = available_alert_user_email_map.get(email)
                self.send_email(user_info, True)
            
        else:
            
            for email in user_obj_email_list:
                user_info = available_alert_user_email_map.get(email)
                self.send_email(user_info)

            self.print_msg("Done")
