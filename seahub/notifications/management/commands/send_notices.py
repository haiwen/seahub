# encoding: utf-8
import datetime
import logging
import string
import simplejson as json
import os

from django.utils.http import urlquote
from django.core.management.base import BaseCommand, CommandError
from django.core.urlresolvers import reverse

import seaserv
from seaserv import seafile_api
from seahub.base.models import CommandsLastCheck
from seahub.notifications.models import UserNotification
from seahub.utils import send_html_email
import seahub.settings as settings
from seahub.avatar.util import get_primary_avatar, get_default_avatar_url
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

    def get_avatar_url(self, user, size=10):

        avatar = get_primary_avatar(user, size)
        if avatar:
            avatar_url = avatar.avatar_url(size)
        else:
            avatar_url = get_default_avatar_url()

        return avatar_url

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

            notices = []
            for notice in unseen_notices:
                if notice.to_user == to_user:

                    if notice.msg_type == "priv_file_share":
                        d = json.loads(notice.detail)

                        priv_share_token = d['priv_share_token']

                        notice.priv_shared_file_url = reverse('view_priv_shared_file', args=[priv_share_token])
                        notice.priv_shared_file_from = d['share_from']
                        notice.priv_shared_file_name = d['file_name']
                        notice.priv_shared_file_from_avatar_url = self.get_avatar_url(d['share_from'])

                    if notice.msg_type == "user_message":
                        notice.user_msg_from_avatar_url = self.get_avatar_url(notice.detail)

                    if notice.msg_type == "group_msg":
                        d = json.loads(notice.detail)

                        group_id = d['group_id']
                        group = seaserv.get_group(int(group_id))
                        if group is None:
                            notice.delete()

                        notice.group_url = reverse('group_discuss', args=[group.id])
                        notice.group_msg_from = d['msg_from']
                        notice.group_name = group.group_name
                        notice.group_msg_from_avatar_url = self.get_avatar_url(d['msg_from'])

                    if notice.msg_type == "grpmsg_reply":
                        d = json.loads(notice.detail)

                        notice.group_msg_reply_url = reverse('msg_reply_new')
                        notice.group_msg_reply_from = d['reply_from']
                        notice.group_msg_reply_from_avatar_url = self.get_avatar_url(d['reply_from'])
                    
                    if notice.msg_type == "repo_share":
                        d = json.loads(notice.detail)

                        repo_id = d['repo_id']
                        repo = seafile_api.get_repo(repo_id)
                        if repo is None:
                            notice.delete()

                        notice.repo_url = reverse('repo', args=[repo.id])
                        notice.repo_share_from = d['share_from']
                        notice.repo_name = repo.name
                        notice.repo_share_from_avatar_url = self.get_avatar_url(d['share_from'])

                    if notice.msg_type == "file_uploaded":
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

                    if notice.msg_type == "group_join_request":
                        d = json.loads(notice.detail)

                        username = d['username']
                        group_id = d['group_id']
                        join_request_msg = d['join_request_msg']

                        group = seaserv.get_group(group_id)
                        if group is None:
                            notice.delete()

                        notice.grpjoin_user_profile_url = reverse('user_profile', args=[username]),
                        notice.grpjoin_group_url = reverse('group_members', args=[group_id])
                        notice.grpjoin_username = username
                        notice.grpjoin_group_name = group.group_name,
                        notice.grpjoin_request_msg = join_request_msg,

                    notices.append(notice)

            if notices:
                subject = subjects[1] if count > 1 else subjects[0]
                avatar_url = self.get_avatar_url(to_user)
                c = { 
                        'to_user': to_user,
                        'notice_count': count,
                        'notices': notices,
                        'avatar_url': avatar_url,
                    }   

                try:
                    send_html_email(subject, 'notifications/notice_email.html', c, 
                            settings.DEFAULT_FROM_EMAIL, [to_user])

                    logger.info('Successfully sent email to %s' % to_user)
                except Exception, e:
                    logger.error('Failed to send email to %s, error detail: %s' % (to_user, e))
            else: 
                return None
