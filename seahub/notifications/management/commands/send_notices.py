# encoding: utf-8
import datetime
import logging
import string

from django.core.management.base import BaseCommand, CommandError
from django.core.urlresolvers import reverse

from seahub.base.models import CommandsLastCheck
from seahub.notifications.models import UserNotification
from seahub.utils import send_html_email
import seahub.settings as settings

from django.template import Context, loader

# Get an instance of a logger
logger = logging.getLogger(__name__)

site_name = settings.SITE_NAME
subjects = (u'New notice on %s' % site_name, u'New notices on %s' % site_name)

class Command(BaseCommand):
    help = 'Send Email notifications to user if he/she has an unread notices every period of seconds .'
    label = "notifications_send_notices"

    def handle(self, *args, **options):
        logger.debug('Start sending user notices...')
        self.do_action()
        logger.debug('Finish sending user notices.\n')

    def do_action(self):
        now = datetime.datetime.now()

        try:
            cmd_last_check = CommandsLastCheck.objects.get(command_type=self.label)
            logger.debug('Last check time is %s' % cmd_last_check.last_check)

            unseen_notices = UserNotification.objects.get_all_notifications(
                seen=False, time_since=cmd_last_check.last_check)

            logger.debug('Update last check time to %s' % now)
            cmd_last_check.last_check = now
            cmd_last_check.save()
        except CommandsLastCheck.DoesNotExist:
            logger.debug('No last check time found, get all unread notices.')
            unseen_notices = UserNotification.objects.get_all_notifications(
                seen=False)

            logger.debug('Create new last check time: %s' % now)
            CommandsLastCheck(command_type=self.label, last_check=now).save()

        
        email_ctx = {}
        for notice in unseen_notices:
            if email_ctx.has_key(notice.to_user):
                email_ctx[notice.to_user] += 1
            else:
                email_ctx[notice.to_user] = 1
        
        for to_user, count in email_ctx.items():
            subject = subjects[1] if count > 1 else subjects[0]
            c = { 
                    'to_user': to_user,
                    'notice_count': count,
                }   

            try:
                send_html_email(subject, 'notifications/notice_email.html', c, 
                        settings.DEFAULT_FROM_EMAIL, [to_user])

                logger.info('Successfully sent email to %s' % to_user)

            except Exception, e:
                logger.error('Failed to send email to %s, error detail: %s' % (to_user, e))
