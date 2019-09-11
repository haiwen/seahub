# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8
from datetime import datetime
import logging
import re
import requests

from django.core.management.base import BaseCommand
from django.core.urlresolvers import reverse
from django.utils import translation
from django.utils.translation import ungettext

from seahub.base.models import CommandsLastCheck
from seahub.notifications.models import UserNotification
from seahub.utils import get_site_scheme_and_netloc, get_site_name
from seahub.auth.models import SocialAuthUser
from seahub.work_weixin.utils import work_weixin_notifications_check, \
    get_work_weixin_access_token, handler_work_weixin_api_response
from seahub.work_weixin.settings import WORK_WEIXIN_NOTIFICATIONS_URL, \
    WORK_WEIXIN_PROVIDER, WORK_WEIXIN_UID_PREFIX, WORK_WEIXIN_AGENT_ID

# Get an instance of a logger
logger = logging.getLogger(__name__)


# https://work.weixin.qq.com/api/doc#90000/90135/90236/

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
    """ send work weixin notifications
    """

    help = 'Send WeChat Work msg to user if he/she has unseen notices every '
    'period of time.'
    label = "notifications_send_wxwork_notices"

    def handle(self, *args, **options):
        self.log_debug('Start sending work weixin msg...')
        self.do_action()
        self.log_debug('Finish sending work weixin msg.\n')

    def send_work_weixin_msg(self, uid, title, content):

        self.log_info('Send wechat msg to user: %s, msg: %s' % (uid, content))

        data = {
            "touser": uid,
            "agentid": WORK_WEIXIN_AGENT_ID,
            'msgtype': 'textcard',
            'textcard': {
                'title': title,
                'description': content,
                'url': self.detail_url,
            },
        }

        api_response = requests.post(self.work_weixin_notifications_url, json=data)
        api_response_dic = handler_work_weixin_api_response(api_response)
        if api_response_dic:
            self.log_info(api_response_dic)
        else:
            self.log_error('can not get work weixin notifications API response')

    def do_action(self):
        # check before start
        if not work_weixin_notifications_check():
            self.log_error('work weixin notifications settings check failed')
            return

        access_token = get_work_weixin_access_token()
        if not access_token:
            self.log_error('can not get access_token')

        self.work_weixin_notifications_url = WORK_WEIXIN_NOTIFICATIONS_URL + '?access_token=' + access_token
        self.detail_url = get_site_scheme_and_netloc().rstrip('/') + reverse('user_notification_list')
        site_name = get_site_name()

        # start
        now = datetime.now()
        today = datetime.now().replace(hour=0).replace(minute=0).replace(
            second=0).replace(microsecond=0)

        # 1. get all users who are connected work weixin
        socials = SocialAuthUser.objects.filter(provider=WORK_WEIXIN_PROVIDER, uid__contains=WORK_WEIXIN_UID_PREFIX)
        users = [(x.username, x.uid[len(WORK_WEIXIN_UID_PREFIX):]) for x in socials]
        self.log_info('Found %d users' % len(users))
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
            to_user__in=list(user_uid_map.keys())
        )
        self.log_info('Found %d notices' % qs.count())
        if qs.count() == 0:
            return

        user_notices = {}
        for q in qs:
            if q.to_user not in user_notices:
                user_notices[q.to_user] = [q]
            else:
                user_notices[q.to_user].append(q)

        # save current language
        cur_language = translation.get_language()
        # active zh-cn
        translation.activate('zh-cn')
        self.log_info('the language is set to zh-cn')

        # 4. send msg to users
        for username, uid in users:
            notices = user_notices.get(username, [])
            count = len(notices)
            if count == 0:
                continue

            title = ungettext(
                "\n"
                "You've got 1 new notice on %(site_name)s:\n",
                "\n"
                "You've got %(num)s new notices on %(site_name)s:\n",
                count
            ) % {'num': count, 'site_name': site_name, }

            content = ''.join([wrap_div(x.format_msg()) for x in notices])
            self.send_work_weixin_msg(uid, title, content)

        # reset language
        translation.activate(cur_language)
        self.log_info('reset language success')
