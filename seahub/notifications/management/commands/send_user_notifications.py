# encoding: utf-8
import logging
import string
from datetime import datetime
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError

from seahub.notifications.models import UserNotification
import seahub.settings as settings

# Get an instance of a logger
logger = logging.getLogger(__name__)

email_template = u'''Hi ${username}：

You have new message today, please go to following page to check out：

${msg_url}

Thanks for using our site!

${site_name} team
'''

site_name = settings.SITE_NAME
subject = u'%s：new message' % site_name
url = settings.SITE_BASE.rstrip('/') + settings.SITE_ROOT + 'home/my/'

class Command(BaseCommand):
    help = 'Send Email notifications to user if he/she has a new group message.'

    def handle(self, *args, **options):
        logger.info('Start sending group notification...')
        self.do_action()
        logger.info('Finish sending group notification.\n')

    def do_action(self):
        today = datetime.now()
        notifications = UserNotification.objects.all()
        
        d = {}
        for e in notifications:
            if today.year != e.timestamp.year or today.month != e.timestamp.month or \
                    today.day != e.timestamp.day: # Only send today's notifications
                continue
            if d.has_key(e.to_user):
                d[e.to_user] += 1
            else:
                d[e.to_user] = 1

        for user,cnt in d.items():
            template = string.Template(email_template)
            content = template.substitute(username=user, msg_url=url, site_name=site_name)
            try:
                send_mail(subject, content, settings.DEFAULT_FROM_EMAIL, [user], \
                              fail_silently=False)
                logger.info('Succesfuuly sended email to %s' % user)
            except Exception, e:
                logger.error('Failed to send email to %s, error detail: %s' % (user, e))
    
