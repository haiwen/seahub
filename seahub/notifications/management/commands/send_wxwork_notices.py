# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
from datetime import datetime
import logging
import re

from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.urlresolvers import reverse
from django.utils import translation
from django.utils.translation import ungettext
from social_django.models import UserSocialAuth
from weworkapi import CorpApi

from seahub.base.models import CommandsLastCheck
from seahub.notifications.models import UserNotification
from seahub.profile.models import Profile
from seahub.utils import get_site_scheme_and_netloc, get_site_name

# Get an instance of a logger
logger = logging.getLogger(__name__)

########## Utility Functions ##########
def wrap_div(s):
    """
    Replace <a ..>xx</a> to xx and wrap content with <div></div>.
    """
    patt = '<a.*?>(.+?)</a>'

    def repl(matchobj):
        return matchobj.group(1)

    return '<div class="highlight">' + re.sub(patt, repl, s) + '</div>'

class CommandLogMixin(object):
    def println(self, msg):
        self.stdout.write('[%s] %s\n' % (str(datetime.now()), msg))

    def log_error(self, msg):
        logger.error(msg)
        self.println(msg)

    def log_info(self, msg):
        logger.info(msg)
        self.println(msg)

    def log_debug(self, msg):
        logger.debug(msg)
        self.println(msg)

#######################################

class Command(BaseCommand, CommandLogMixin):
    help = 'Send WeChat Work msg to user if he/she has unseen notices every '
    'period of time.'
    label = "notifications_send_wxwork_notices"

    def handle(self, *args, **options):
        self.log_debug('Start sending WeChat Work msg...')
        self.api = CorpApi.CorpApi(settings.SOCIAL_AUTH_WEIXIN_WORK_KEY,
                                   settings.SOCIAL_AUTH_WEIXIN_WORK_SECRET)

        self.do_action()
        self.log_debug('Finish sending WeChat Work msg.\n')

    def send_wx_msg(self, uid, title, content, detail_url):
        try:
            self.log_info('Send wechat msg to user: %s, msg: %s' % (uid, content))
            response = self.api.httpCall(
                CorpApi.CORP_API_TYPE['MESSAGE_SEND'],
                {
                    "touser": uid,
                    "agentid": settings.SOCIAL_AUTH_WEIXIN_WORK_AGENTID,
                    'msgtype': 'textcard',
                    # 'climsgid': 'climsgidclimsgid_d',
                    'textcard': {
                        'title': title,
                        'description': content,
                        'url': detail_url,
                    },
                    'safe': 0,
                })
            self.log_info(response)
        except Exception as ex:
            logger.error(ex, exc_info=True)

    def get_user_language(self, username):
        return Profile.objects.get_user_language(username)

    def do_action(self):
        now = datetime.now()
        today = datetime.now().replace(hour=0).replace(minute=0).replace(
            second=0).replace(microsecond=0)

        # 1. get all users who are connected wechat work
        socials = UserSocialAuth.objects.filter(provider='weixin-work')
        users = [(x.username, x.uid) for x in socials]
        if not users:
            return

        user_uid_map = {}
        for username, uid in users:
            user_uid_map[username] = uid

        # 2. get previous time that command last runs
        try:
            cmd_last_check = CommandsLastCheck.objects.get(command_type=self.label)
            self.log_debug('Last check time is %s' % cmd_last_check.last_check)

            last_check_dt = cmd_last_check.last_check

            cmd_last_check.last_check = now
            cmd_last_check.save()
        except CommandsLastCheck.DoesNotExist:
            last_check_dt = today
            self.log_debug('Create new last check time: %s' % now)
            CommandsLastCheck(command_type=self.label, last_check=now).save()

        # 3. get all unseen notices for those users
        qs = UserNotification.objects.filter(
            timestamp__gt=last_check_dt
        ).filter(seen=False).filter(
            to_user__in=user_uid_map.keys()
        )

        user_notices = {}
        for q in qs:
            if q.to_user not in user_notices:
                user_notices[q.to_user] = [q]
            else:
                user_notices[q.to_user].append(q)

        # 4. send msg to users
        url = get_site_scheme_and_netloc().rstrip('/') + reverse('user_notification_list')

        for username, uid in users:
            notices = user_notices.get(username, [])
            count = len(notices)
            if count == 0:
                continue

            # save current language
            cur_language = translation.get_language()

            # get and active user language
            user_language = self.get_user_language(username)
            translation.activate(user_language)
            self.log_debug('Set language code to %s for user: %s' % (
                user_language, username))

            title = ungettext(
                "\n"
                "You've got 1 new notice on %(site_name)s:\n",
                "\n"
                "You've got %(num)s new notices on %(site_name)s:\n",
                count
            ) % {
                'num': count,
                'site_name': get_site_name(),
            }
            content = ''.join([wrap_div(x.format_msg()) for x in notices])
            self.send_wx_msg(uid, title, content, url)

            translation.activate(cur_language)
