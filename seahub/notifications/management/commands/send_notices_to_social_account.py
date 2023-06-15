# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8
from datetime import datetime
import logging
import re
import json
import requests

from django.core.management.base import BaseCommand
from django.urls import reverse
from django.utils import translation
from django.utils.translation import gettext as _

from seahub.base.models import CommandsLastCheck
from seahub.notifications.models import UserNotification
from seahub.utils import get_site_scheme_and_netloc, get_site_name
from seahub.auth.models import SocialAuthUser

from seahub.dingtalk.utils import dingtalk_get_access_token, dingtalk_get_userid_by_unionid
from seahub.dingtalk.settings import DINGTALK_MESSAGE_SEND_TO_CONVERSATION_URL, \
        DINGTALK_AGENT_ID, ENABLE_DINGTALK

from seahub.work_weixin.utils import get_work_weixin_access_token, handler_work_weixin_api_response
from seahub.work_weixin.settings import WORK_WEIXIN_NOTIFICATIONS_URL, \
    WORK_WEIXIN_PROVIDER, WORK_WEIXIN_UID_PREFIX, WORK_WEIXIN_AGENT_ID, ENABLE_WORK_WEIXIN

# Get an instance of a logger
logger = logging.getLogger(__name__)

########## Utility Functions ##########

# https://ding-doc.dingtalk.com/doc#/serverapi3/wvdxel
def remove_html_a_element_for_dingtalk(s):
    """
    Replace <a ..>xx</a> to xx and wrap content with <div></div>.
    """
    patt = '<a.*?>(.+?)</a>'

    def repl(matchobj):
        return matchobj.group(1)

    return re.sub(patt, repl, s)

# https://work.weixin.qq.com/api/doc#90000/90135/90236/
def wrap_div_for_work_weixin(s):
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


class Command(BaseCommand, CommandLogMixin):
    """ send dingtalk/work weixin notifications
    """

    help = "Send notices to user's social account if he/she has unseen notices every period of time."
    label = "notifications_send_notices_to_social_account"

    def handle(self, *args, **options):

        if ENABLE_DINGTALK:
            self.log_debug('Start sending dingtalk msg...')
        if ENABLE_WORK_WEIXIN:
            self.log_debug('Start sending work weixin msg...')

        self.do_action()

        if ENABLE_DINGTALK:
            self.log_debug('Finish sending dingtalk msg.\n')
        if ENABLE_WORK_WEIXIN:
            self.log_debug('Finish sending work weixin msg.\n')

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

        if not ENABLE_DINGTALK and not ENABLE_WORK_WEIXIN:
            self.log_info('No social account enabled')
            return

        dingtalk_access_token = ''
        work_weixin_access_token = ''

        if ENABLE_DINGTALK:

            dingtalk_access_token = dingtalk_get_access_token()
            if not dingtalk_access_token:
                self.log_error('can not get access token for dingtalk')
            else:
                self.dingtalk_message_send_to_conversation_url = DINGTALK_MESSAGE_SEND_TO_CONVERSATION_URL + \
                        '?access_token=' + dingtalk_access_token
                self.detail_url = get_site_scheme_and_netloc().rstrip('/') + reverse('user_notification_list')

        if ENABLE_WORK_WEIXIN:

            work_weixin_access_token = get_work_weixin_access_token()
            if not work_weixin_access_token:
                self.log_error('can not get access token for work weixin')
            else:
                self.work_weixin_notifications_url = WORK_WEIXIN_NOTIFICATIONS_URL + \
                        '?access_token=' + work_weixin_access_token
                self.detail_url = get_site_scheme_and_netloc().rstrip('/') + reverse('user_notification_list')

        if not dingtalk_access_token and not work_weixin_access_token:
            return

        # save current language
        cur_language = translation.get_language()
        # active zh-cn
        translation.activate('zh-cn')
        self.log_info('the language is set to zh-cn')

        # 1. get previous time that command last runs
        now = datetime.now()
        today = datetime.now().replace(hour=0).replace(minute=0).replace(second=0).replace(microsecond=0)

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

        # 2. get all unseen notices
        user_notifications = UserNotification.objects.filter(timestamp__gt=last_check_dt).filter(seen=False)
        self.log_info('Found %d notices' % user_notifications.count())
        if user_notifications.count() == 0:
            return

        # 3. get all users should send notice to
        user_email_list = list(set([item.to_user for item in user_notifications]))

        dingtail_socials = SocialAuthUser.objects.filter(provider='dingtalk').filter(username__in=user_email_list)
        dingtalk_email_list = [item.username for item in dingtail_socials]
        dingtalk_email_uid_dict = {}
        for item in dingtail_socials:
            dingtalk_email_uid_dict[item.username] = dingtalk_get_userid_by_unionid(item.uid)

        work_weixin_socials = SocialAuthUser.objects.filter(provider=WORK_WEIXIN_PROVIDER, \
                uid__contains=WORK_WEIXIN_UID_PREFIX).filter(username__in=user_email_list)
        work_weixin_email_list = [item.username for item in work_weixin_socials]
        work_weixin_email_uid_dict = {}
        for item in work_weixin_socials:
            work_weixin_email_uid_dict[item.username] = item.uid[len(WORK_WEIXIN_UID_PREFIX):]

        # 4. send msg
        site_name = get_site_name()

        for email in list(set(dingtalk_email_list + work_weixin_email_list)):

            should_send = []
            for notification in user_notifications:
                if email == notification.to_user:
                    should_send.append(notification)

            title = _("You've got %(num)s new notices on %(site_name)s:\n") % \
                    {'num': len(should_send), 'site_name': site_name, }

            has_sent = False

            if not has_sent and email in dingtalk_email_list and ENABLE_DINGTALK:
                content = '  \n  '.join([remove_html_a_element_for_dingtalk(x.format_msg()) for x in should_send])
                self.send_dingtalk_msg(dingtalk_email_uid_dict[email], title, content)
                has_sent = True

            if not has_sent and email in work_weixin_email_list and ENABLE_WORK_WEIXIN:
                content = ''.join([wrap_div_for_work_weixin(x.format_msg()) for x in should_send])
                self.send_work_weixin_msg(work_weixin_email_uid_dict[email], title, content)
                has_sent = True

        translation.activate(cur_language)
        self.log_info('reset language success')
        return
