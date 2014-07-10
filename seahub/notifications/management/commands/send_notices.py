# encoding: utf-8
import datetime
import logging
import json
import os
import re

from django.utils.http import urlquote
from django.core.management.base import BaseCommand
from django.core.urlresolvers import reverse
from django.utils.html import escape
from django.utils import translation
from django.utils.translation import ugettext as _

import seaserv
from seaserv import seafile_api
from seahub.base.models import CommandsLastCheck
from seahub.notifications.models import UserNotification
from seahub.utils import send_html_email, get_service_url, \
    get_site_scheme_and_netloc
import seahub.settings as settings
from seahub.avatar.templatetags.avatar_tags import avatar
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile

# Get an instance of a logger
logger = logging.getLogger(__name__)

subject = _('New notice on %s') % settings.SITE_NAME

class Command(BaseCommand):
    help = 'Send Email notifications to user if he/she has an unread notices every period of seconds .'
    label = "notifications_send_notices"

    def handle(self, *args, **options):
        logger.debug('Start sending user notices...')
        self.do_action()
        logger.debug('Finish sending user notices.\n')

    def get_avatar_url(self, username, default_size=20):
        img_tag = avatar(username, default_size)
        pattern = r'src="(.*)"'
        repl = r'src="%s\1"' % get_site_scheme_and_netloc()
        return re.sub(pattern, repl, img_tag)

    def format_priv_file_share_msg(self, notice):
        d = json.loads(notice.detail)
        priv_share_token = d['priv_share_token']
        notice.priv_shared_file_url = reverse('view_priv_shared_file',
                                              args=[priv_share_token])
        notice.priv_shared_file_from = escape(email2nickname(d['share_from']))
        notice.priv_shared_file_name = d['file_name']
        notice.priv_shared_file_from_avatar_url = self.get_avatar_url(d['share_from'])

        return notice

    def format_user_message(self, notice):
        d = notice.user_message_detail_to_dict()
        user_msg_from = d['msg_from']
        message = d.get('message')

        notice.user_msg_from = escape(email2nickname(user_msg_from))
        notice.user_msg_from_avatar_url = self.get_avatar_url(user_msg_from)
        notice.user_msg_url = reverse('user_msg_list', args=[user_msg_from])
        notice.user_msg = message
        return notice

    def format_group_message(self, notice):
        d = notice.group_message_detail_to_dict()
        group_id = d['group_id']
        message = d['message']
        group = seaserv.get_group(int(group_id))
        if group is None:
            notice.delete()

        notice.group_url = reverse('group_discuss', args=[group.id])
        notice.group_msg_from = escape(email2nickname(d['msg_from']))
        notice.group_name = group.group_name
        notice.group_msg_from_avatar_url = self.get_avatar_url(d['msg_from'])
        notice.grp_msg = message
        return notice

    def format_grpmsg_reply(self, notice):
        d = notice.grpmsg_reply_detail_to_dict()
        message = d.get('reply_msg')

        notice.group_msg_reply_url = reverse('msg_reply_new')
        notice.group_msg_reply_from = escape(email2nickname(d['reply_from']))
        notice.group_msg_reply_from_avatar_url = self.get_avatar_url(d['reply_from'])
        notice.grp_reply_msg = message
        return notice

    def format_repo_share_msg(self, notice):
        d = json.loads(notice.detail)

        repo_id = d['repo_id']
        repo = seafile_api.get_repo(repo_id)
        if repo is None:
            notice.delete()

        notice.repo_url = reverse('repo', args=[repo.id])
        notice.repo_share_from = escape(email2nickname(d['share_from']))
        notice.repo_name = repo.name
        notice.repo_share_from_avatar_url = self.get_avatar_url(d['share_from'])
        return notice

    def format_file_uploaded_msg(self, notice):
        d = json.loads(notice.detail)

        file_name = d['file_name']
        repo_id = d['repo_id']
        uploaded_to = d['uploaded_to'].rstrip('/')
        file_path = uploaded_to + '/' + file_name
        file_link = reverse('repo_view_file', args=[repo_id]) + '?p=' + urlquote(file_path)
        folder_link = reverse('repo', args=[repo_id]) + '?p=' + urlquote(uploaded_to)
        folder_name = os.path.basename(uploaded_to)

        notice.uploaded_file_link = file_link
        notice.uploaded_file_name = file_name
        notice.uploaded_folder_link = folder_link
        notice.uploaded_folder_name = folder_name
        return notice

    def format_group_join_request(self, notice):
        d = json.loads(notice.detail)
        username = d['username']
        group_id = d['group_id']
        join_request_msg = d['join_request_msg']

        group = seaserv.get_group(group_id)
        if group is None:
            notice.delete()

        notice.grpjoin_user_profile_url = reverse('user_profile',
                                                  args=[username])
        notice.grpjoin_group_url = reverse('group_members', args=[group_id])
        notice.grpjoin_username = username
        notice.grpjoin_group_name = group.group_name
        notice.grpjoin_request_msg = join_request_msg
        return notice

    def get_user_language(self, username):
        return Profile.objects.get_user_language(username)

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
            if notice.to_user in email_ctx:
                email_ctx[notice.to_user] += 1
            else:
                email_ctx[notice.to_user] = 1

        for to_user, count in email_ctx.items():
            # save current language
            cur_language = translation.get_language()

            # get and active user language
            user_language = self.get_user_language(to_user)
            translation.activate(user_language)
            logger.info('Set language code to %s', user_language)

            notices = []
            for notice in unseen_notices:
                if notice.to_user != to_user:
                    continue

                if notice.is_priv_file_share_msg():
                    notice = self.format_priv_file_share_msg(notice)

                elif notice.is_user_message():
                    notice = self.format_user_message(notice)

                elif notice.is_group_msg():
                    notice = self.format_group_message(notice)

                elif notice.is_grpmsg_reply():
                    notice = self.format_grpmsg_reply(notice)

                elif notice.is_repo_share_msg():
                    notice = self.format_repo_share_msg(notice)

                elif notice.is_file_uploaded_msg():
                    notice = self.format_file_uploaded_msg(notice)

                elif notice.is_group_join_request():
                    notice = self.format_group_join_request(notice)

                notices.append(notice)

            if not notices:
                continue

            c = { 
                'to_user': to_user,
                'notice_count': count,
                'notices': notices,
                'avatar_url': self.get_avatar_url(to_user),
                'service_url': get_service_url(),
                }   

            try:
                send_html_email(_('New notice on %s') % settings.SITE_NAME,
                                'notifications/notice_email.html', c,
                                None, [to_user])

                logger.info('Successfully sent email to %s' % to_user)
            except Exception as e:
                logger.error('Failed to send email to %s, error detail: %s' % (to_user, e))

            # restore current language
            translation.activate(cur_language)
