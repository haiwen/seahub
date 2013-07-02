# encoding: utf-8
import logging
import string
from datetime import datetime, timedelta

from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError
from django.core.urlresolvers import reverse

from seahub.message.models import UserMessage, UserMsgLastCheck
import seahub.settings as settings

# Get an instance of a logger
logger = logging.getLogger(__name__)

email_templates = (u'''Hi, ${to_email}
You've got ${count} new message on ${site_name}.

Go check out at ${url}
''',
u'''Hi, ${to_email}
You've got ${count} new messages on ${site_name}.

Go check out at ${url}
''')

                  

site_name = settings.SITE_NAME
subjects = (u'New message on %s' % site_name, u'New messages on %s' % site_name)
url = settings.SITE_BASE.rstrip('/') + reverse('message_list')

class Command(BaseCommand):
    help = 'Send Email notifications to user if he/she has a unread user message.'

    def handle(self, *args, **options):
        logger.debug('Start sending user message...')
        self.do_action()
        logger.debug('Finish sending user message.\n')

    def do_action(self):
        now = datetime.now()

        if not UserMsgLastCheck.objects.all():
            logger.debug('No last check time found, get all unread msgs.')
            unread_msgs = UserMessage.objects.filter(ifread=0)

            logger.debug('Create new last check time: %s' % now)
            UserMsgLastCheck(check_time=now).save()            
        else:
            last_check = UserMsgLastCheck.objects.all()[0]
            last_check_time = last_check.check_time
            logger.debug('Last check time is %s' % last_check_time)
            unread_msgs = UserMessage.objects.filter(timestamp__gt=last_check_time).filter(ifread=0)

            logger.debug('Update last check time to %s' % now)
            last_check.check_time = now
            last_check.save()

        # handle msgs
        email_ctx = {}

        for msg in unread_msgs:
            if email_ctx.has_key(msg.to_email):
                email_ctx[msg.to_email] += 1
            else:
                email_ctx[msg.to_email] = 1
        
        for to_email, count in email_ctx.items():
            subject = subjects[1] if count > 1 else subjects[0]
            template = string.Template(email_templates[1]) if count > 1 else \
                string.Template(email_templates[0])
            content = template.substitute(to_email=to_email, count=count,
                                         site_name=site_name, url=url)

            try:
                send_mail(subject, content, settings.DEFAULT_FROM_EMAIL,
                          [to_email], fail_silently=False)
                logger.info('Successfully sended email to %s' % to_email)
            except Exception, e:
                logger.error('Failed to send email to %s, error detail: %s' % (to_email, e))


        
    
