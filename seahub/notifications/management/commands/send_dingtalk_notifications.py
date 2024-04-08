# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8
from datetime import datetime
import logging
import re
import requests
import json

from django.core.management.base import BaseCommand
from django.urls import reverse
from django.utils import translation
from django.utils.translation import ngettext

from seahub.base.models import CommandsLastCheck
from seahub.notifications.models import UserNotification
from seahub.utils import get_site_scheme_and_netloc, get_site_name
from seahub.auth.models import SocialAuthUser

from seahub.dingtalk.settings import DINGTALK_MESSAGE_SEND_TO_CONVERSATION_URL, \
        DINGTALK_AGENT_ID

# for 10.0 or later
from seahub.dingtalk.settings import DINGTALK_APP_KEY, \
        DINGTALK_APP_SECRET

if DINGTALK_APP_KEY and DINGTALK_APP_SECRET:
    from seahub.dingtalk.utils import dingtalk_get_orgapp_token as dingtalk_get_access_token
    from seahub.dingtalk.utils import dingtalk_get_userid_by_unionid_new as dingtalk_get_userid_by_unionid
else:
    from seahub.dingtalk.utils import dingtalk_get_access_token, dingtalk_get_userid_by_unionid


# Get an instance of a logger
logger = logging.getLogger(__name__)


# https://ding-doc.dingtalk.com/doc#/serverapi3/wvdxel

########## Utility Functions ##########
def remove_html_a_element(s):
    """
    Replace <a ..>xx</a> to xx and wrap content with <div></div>.
    """
    patt = '<a.*?>(.+?)</a>'

    def repl(matchobj):
        return matchobj.group(1)

    return re.sub(patt, repl, s)


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
    """ send dingtalk notifications
    """

    help = 'Send dingtalk msg to user if he/she has unseen notices every '
    'period of time.'
    label = "notifications_send_dingtalk_notices"

    def handle(self, *args, **options):
        self.log_debug('Start sending dingtalk msg...')
        self.do_action()
        self.log_debug('Finish sending dingtalk msg.\n')

    def send_dingtalk_msg(self, user_id, title, content):

        self.log_info('Send dingtalk msg to user: %s, msg: %s' % (user_id, content))
        data = {
            "agent_id": DINGTALK_AGENT_ID,
            "userid_list": user_id,
            "msg": {
                "msgtype": "markdown",
                "markdown": {
                    "title": title,
                    "text": content
                }
            }
        }
        resp_json = requests.post(self.dingtalk_message_send_to_conversation_url,
                                  data=json.dumps(data)).json()
        if resp_json.get('errcode') != 0:
            self.log_info(resp_json)

    def do_action(self):

        # check before start
        access_token = dingtalk_get_access_token()
        if not access_token:
            self.log_error('can not get access_token')

        self.dingtalk_message_send_to_conversation_url = DINGTALK_MESSAGE_SEND_TO_CONVERSATION_URL + '?access_token=' + access_token
        self.detail_url = get_site_scheme_and_netloc().rstrip('/') + reverse('user_notification_list')
        site_name = get_site_name()

        # start
        now = datetime.now()
        today = datetime.now().replace(hour=0).replace(minute=0).replace(
            second=0).replace(microsecond=0)

        # 1. get all users who are connected dingtalk
        socials = SocialAuthUser.objects.filter(provider='dingtalk')
        users = [(x.username, x.uid) for x in socials]
        self.log_info('Found %d users' % len(users))
        if not users:
            return

        user_uid_map = {}
        for username, uid in users:
            user_uid_map[username] = dingtalk_get_userid_by_unionid(uid)

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
            user_id = user_uid_map[username]
            notices = user_notices.get(username, [])
            count = len(notices)
            if count == 0:
                continue

            title = ngettext(
                "\n"
                "You've got 1 new notice on %(site_name)s:\n",
                "\n"
                "You've got %(num)s new notices on %(site_name)s:\n",
                count
            ) % {'num': count, 'site_name': site_name, }

            content = '  \n  '.join([remove_html_a_element(x.format_msg()) for x in notices])
            self.send_dingtalk_msg(user_id, title, content)

        # reset language
        translation.activate(cur_language)
        self.log_info('reset language success')
