# encoding: utf-8
import datetime
import logging
import string

from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError
from django.core.urlresolvers import reverse

from seahub.base.models import CommandsLastCheck
from seahub.notifications.models import UserNotification
import seahub.settings as settings

# Get an instance of a logger
logger = logging.getLogger(__name__)

email_templates = (u'''Hi, ${to_user}
You've got ${count} new notice on ${site_name}.

Go check out at ${url}

Thanks for using our site!

${site_name} team
''',
u'''Hi, ${to_user}
You've got ${count} new notices on ${site_name}.

Go check out at ${url}

Thanks for using our site!

${site_name} team
''')

                  

site_name = settings.SITE_NAME
subjects = (u'New notice on %s' % site_name, u'New notices on %s' % site_name)
url = settings.SITE_BASE.rstrip('/') + reverse('user_notification_list')

class Command(BaseCommand):
    help = 'Send Email notifications to user if he/she has a unread notices every period of seconds .'
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
            template = string.Template(email_templates[1]) if count > 1 else \
                string.Template(email_templates[0])
            content = template.substitute(to_user=to_user, count=count,
                                         site_name=site_name, url=url)

            try:
                send_mail(subject, content, settings.DEFAULT_FROM_EMAIL,
                          [to_user], fail_silently=False)
                logger.info('Successfully sent email to %s' % to_user)
            except Exception, e:
                logger.error('Failed to send email to %s, error detail: %s' % (to_user, e))
