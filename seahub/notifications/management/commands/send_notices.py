# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import datetime
import logging
import json
import os
import re

from django.core.management.base import BaseCommand
from django.urls import reverse
from django.utils.html import escape
from django.utils import translation
from django.utils.translation import gettext as _

from seaserv import seafile_api, ccnet_api
from seahub.notifications.models import UserNotification, MSG_TYPE_FILE_COMMENT
from seahub.utils import send_html_email, get_site_scheme_and_netloc
from seahub.avatar.templatetags.avatar_tags import avatar
from seahub.avatar.util import get_default_avatar_url
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.invitations.models import Invitation
from seahub.profile.models import Profile
from seahub.constants import HASH_URLS
from seahub.utils import get_site_name
from seahub.options.models import UserOptions, KEY_COLLABORATE_EMAIL_INTERVAL, \
    KEY_COLLABORATE_LAST_EMAILED_TIME, DEFAULT_COLLABORATE_EMAIL_INTERVAL
from seahub.seadoc.models import SeadocNotification
from seahub.tags.models import FileUUIDMap
from seahub.notifications.utils import gen_sdoc_smart_link
from seahub.utils.auth import VIRTUAL_ID_EMAIL_DOMAIN

# Get an instance of a logger
logger = logging.getLogger('seahub_email_sender')

class Command(BaseCommand):
    help = 'Send Email notifications to user if he/she has an unread notices every period of seconds .'
    label = "notifications_send_notices"

    def handle(self, *args, **options):
        logger.debug('Start sending user notices...')
        self.do_action()
        logger.debug('Finish sending user notices.\n')

    def get_avatar(self, username):
        img_tag = avatar(username, 128)
        pattern = r'src="(.*)"'
        repl = r'src="%s\1"' % get_site_scheme_and_netloc()
        return re.sub(pattern, repl, img_tag)

    def get_avatar_src(self, username):
        avatar_img = self.get_avatar(username)
        m = re.search('<img src="(.*?)".*', avatar_img)
        if m:
            return m.group(1)
        else:
            return ''

    def get_default_avatar(self, default_size=32):
        # user default avatar
        img_tag = """<img src="%s" width="%s" height="%s" class="avatar" alt="" />""" % \
                (get_default_avatar_url(), default_size, default_size)
        pattern = r'src="(.*)"'
        repl = r'src="%s\1"' % get_site_scheme_and_netloc()
        return re.sub(pattern, repl, img_tag)

    def get_default_avatar_src(self, default_size=32):
        avatar_img = self.get_default_avatar(default_size)
        m = re.search('<img src="(.*?)".*', avatar_img)
        if m:
            return m.group(1)
        else:
            return ''

    def format_repo_share_msg(self, notice):
        d = json.loads(notice.detail)
        repo_id = d['repo_id']
        repo = seafile_api.get_repo(repo_id)
        path = d['path']
        org_id = d.get('org_id', None)
        if path == '/':
            shared_type = 'library'
        else:
            shared_type = 'folder'
            if org_id:
                owner = seafile_api.get_org_repo_owner(repo_id)
                repo = seafile_api.get_org_virtual_repo(
                    org_id, repo_id, path, owner)
            else:
                owner = seafile_api.get_repo_owner(repo_id)
                repo = seafile_api.get_virtual_repo(repo_id, path, owner)

        repo_url = reverse('lib_view', args=[repo.id, repo.name, ''])
        notice.repo_url = repo_url
        notice.notice_from = escape(email2nickname(d['share_from']))
        notice.repo_name = repo.name
        notice.avatar_src = self.get_avatar_src(d['share_from'])
        notice.shared_type = shared_type

        return notice

    def format_repo_share_to_group_msg(self, notice):
        d = json.loads(notice.detail)

        repo_id = d['repo_id']
        repo = seafile_api.get_repo(repo_id)
        group_id = d['group_id']
        group = ccnet_api.get_group(group_id)
        org_id = d.get('org_id', None)

        path = d['path']
        if path == '/':
            shared_type = 'library'
        else:
            shared_type = 'folder'
            if org_id:
                owner = seafile_api.get_org_repo_owner(repo_id)
                repo = seafile_api.get_org_virtual_repo(
                    org_id, repo_id, path, owner)
            else:
                owner = seafile_api.get_repo_owner(repo_id)
                repo = seafile_api.get_virtual_repo(repo_id, path, owner)

        repo_url = reverse('lib_view', args=[repo.id, repo.name, ''])
        notice.repo_url = repo_url
        notice.notice_from = escape(email2nickname(d['share_from']))
        notice.repo_name = repo.name
        notice.avatar_src = self.get_avatar_src(d['share_from'])
        notice.group_url = reverse('group', args=[group.id])
        notice.group_name = group.group_name
        notice.shared_type = shared_type

        return notice

    def format_file_uploaded_msg(self, notice):
        d = json.loads(notice.detail)

        file_name = d['file_name']
        repo_id = d['repo_id']
        repo = seafile_api.get_repo(repo_id)
        uploaded_to = d['uploaded_to'].rstrip('/')
        file_path = uploaded_to + '/' + file_name
        file_link = reverse('view_lib_file', args=[repo_id, file_path])

        folder_link = reverse('lib_view', args=[repo_id, repo.name, uploaded_to.strip('/')])
        folder_name = os.path.basename(uploaded_to)

        notice.file_link = file_link
        notice.file_name = file_name
        notice.folder_link = folder_link
        notice.folder_name = folder_name
        notice.avatar_src = self.get_default_avatar_src()
        return notice

    def format_folder_uploaded_msg(self, notice):
        d = json.loads(notice.detail)

        folder_name = d['folder_name']
        repo_id = d['repo_id']
        repo = seafile_api.get_repo(repo_id)

        uploaded_to = d['uploaded_to']
        if uploaded_to != '/':
            uploaded_to = d['uploaded_to'].rstrip('/')
            folder_path = uploaded_to + '/' + folder_name
            parent_dir_link = reverse('lib_view', args=[repo_id, repo.name, uploaded_to.strip('/')])
            parent_dir_name = os.path.basename(uploaded_to)
        else:
            folder_path = '/' + folder_name
            parent_dir_link = reverse('lib_view', args=[repo_id, repo.name, ''])
            parent_dir_name = repo.name

        folder_link = reverse('lib_view', args=[repo_id, repo.name, folder_path.strip('/')])
        notice.folder_link = folder_link
        notice.folder_name = folder_name
        notice.parent_dir_link = parent_dir_link
        notice.parent_dir_name = parent_dir_name
        notice.avatar_src = self.get_default_avatar_src()
        return notice

    def format_group_join_request(self, notice):
        d = json.loads(notice.detail)
        username = d['username']
        group_id = d['group_id']
        join_request_msg = d['join_request_msg']

        group = ccnet_api.get_group(group_id)

        notice.grpjoin_user_profile_url = reverse('user_profile',
                                                  args=[username])
        notice.grpjoin_group_url = HASH_URLS['GROUP_MEMBERS'] % {'group_id': group_id}
        notice.notice_from = escape(email2nickname(username))
        notice.grpjoin_group_name = group.group_name
        notice.grpjoin_request_msg = join_request_msg
        notice.avatar_src = self.get_avatar_src(username)
        return notice

    def format_add_user_to_group(self, notice):
        d = json.loads(notice.detail)
        group_staff = d['group_staff']
        group_id = d['group_id']

        group = ccnet_api.get_group(group_id)

        notice.notice_from = escape(email2nickname(group_staff))
        notice.avatar_src = self.get_avatar_src(group_staff)
        notice.group_staff_profile_url = reverse('user_profile',
                                                 args=[group_staff])
        notice.group_url = reverse('group', args=[group.id])
        notice.group_name = group.group_name
        return notice

    def format_file_comment_msg(self, notice):
        d = json.loads(notice.detail)
        repo_id = d['repo_id']
        file_path = d['file_path']
        author = d['author']

        notice.file_url = reverse('view_lib_file', args=[repo_id, file_path])
        notice.file_name = os.path.basename(file_path)
        notice.author = author
        return notice

    def format_guest_invitation_accepted_msg(self, notice):
        d = json.loads(notice.detail)
        inv_id = d['invitation_id']
        try:
            inv = Invitation.objects.get(pk=inv_id)
        except Invitation.DoesNotExist:
            self.delete()
            return None

        notice.inv_accepter = inv.accepter
        notice.inv_url = '#invitations/'
        notice.inv_accept_at = inv.accept_time.strftime("%Y-%m-%d %H:%M:%S")
        return notice

    def format_deleted_files_msg(self, notice):
        d = json.loads(notice.detail)
        repo_id = d['repo_id']
        repo = seafile_api.get_repo(repo_id)
        repo_url = reverse('lib_view', args=[repo.id, repo.name, ''])

        notice.repo_url = repo_url
        notice.repo_name = repo.name
        notice.avatar_src = self.get_avatar_src(notice.to_user)
        return notice

    def format_repo_monitor_msg(self, notice):
        d = json.loads(notice.detail)
        op_user_email = d['op_user']
        notice.avatar_src = self.get_avatar_src(op_user_email)
        notice.repo_monitor_msg = notice.format_msg()
        return notice

    def format_saml_sso_error_msg(self, notice):
        d = json.loads(notice.detail)
        notice.error_msg = d['error_msg']
        return notice

    def format_sdoc_msg(self, sdoc_queryset, sdoc_notice):
        sdoc_obj = sdoc_queryset.filter(uuid=sdoc_notice.doc_uuid).first()
        if not sdoc_obj:
            return None
        notice = UserNotification()
        notice.msg_type = MSG_TYPE_FILE_COMMENT
        notice.to_user = sdoc_notice.username
        notice.timestamp = sdoc_notice.created_at
        notice.file_url = gen_sdoc_smart_link(sdoc_notice.doc_uuid, with_service_url=False)
        notice.file_name = str(sdoc_obj.filename)[:-5]
        detail = json.loads(sdoc_notice.detail)
        author = email2nickname(detail.get('author'))
        notice.author = author
        notice.avatar_src = self.get_avatar_src(author)
        return notice

    def get_user_language(self, username):
        return Profile.objects.get_user_language(username)

    def get_user_intervals_and_notices(self):
        """
        filter users who have collaborate-notices in last longest interval
        And right now, the longest interval is DEFAULT_COLLABORATE_EMAIL_INTERVAL
        """
        last_longest_interval_time = datetime.datetime.now() - datetime.timedelta(
            seconds=DEFAULT_COLLABORATE_EMAIL_INTERVAL)

        all_unseen_notices = UserNotification.objects.get_all_notifications(
            seen=False, time_since=last_longest_interval_time).order_by('-timestamp')
        all_unseen_sdoc_notices = SeadocNotification.objects.filter(
            seen=False, created_at__gt=last_longest_interval_time).order_by('-created_at')
        sdoc_queryset = FileUUIDMap.objects.filter(uuid__in=[item.doc_uuid for item in all_unseen_sdoc_notices])

        results = {}
        for notice in all_unseen_notices:
            if notice.to_user not in results:
                results[notice.to_user] = {'notices': [notice],
                                           'sdoc_notices': [],
                                           'interval': DEFAULT_COLLABORATE_EMAIL_INTERVAL}
            else:
                results[notice.to_user]['notices'].append(notice)

        for sdoc_notice in all_unseen_sdoc_notices:
            if sdoc_notice.username not in results:
                results[sdoc_notice.username] = {'notices': [],
                                                 'sdoc_notices': [sdoc_notice],
                                                 'interval': DEFAULT_COLLABORATE_EMAIL_INTERVAL}
            else:
                results[sdoc_notice.username]['sdoc_notices'].append(sdoc_notice)

        user_options = UserOptions.objects.filter(
            email__in=results.keys(), option_key=KEY_COLLABORATE_EMAIL_INTERVAL)
        for option in user_options:
            email, interval = option.email, option.option_val
            try:
                interval = int(interval)
            except ValueError:
                logger.warning('user: %s, %s invalid, val: %s', email, KEY_COLLABORATE_EMAIL_INTERVAL, interval)
                interval = DEFAULT_COLLABORATE_EMAIL_INTERVAL
            if interval <= 0:
                del results[email]
            else:
                results[email]['interval'] = interval

        return [(key, value['interval'],
                 value['notices'], value['sdoc_notices'],
                 sdoc_queryset) for key, value in results.items()]

    def do_action(self):

        user_interval_notices = self.get_user_intervals_and_notices()
        last_emailed_list = UserOptions.objects.filter(option_key=KEY_COLLABORATE_LAST_EMAILED_TIME).values_list('email', 'option_val')
        user_last_emailed_time_dict = {le[0]: datetime.datetime.strptime(le[1], "%Y-%m-%d %H:%M:%S") for le in last_emailed_list}

        # check if to_user active
        user_active_dict = {}
        for (to_user, interval_val, notices, sdoc_notices, sdoc_queryset) in user_interval_notices:

            if to_user in user_active_dict:
                continue
            else:
                try:
                    to_user_obj = User.objects.get(email=to_user)
                except User.DoesNotExist:
                    user_active_dict[to_user] = False
                    continue

                user_active_dict[to_user] = to_user_obj.is_active

        # save current language
        cur_language = translation.get_language()
        for (to_user, interval_val, notices, sdoc_notices, sdoc_queryset) in user_interval_notices:

            if not user_active_dict[to_user]:
                continue

            contact_email = Profile.objects.get_contact_email_by_user(to_user)
            if not contact_email or VIRTUAL_ID_EMAIL_DOMAIN in contact_email:
                continue

            # get last_emailed_time if any, defaults to today 00:00:00.0
            last_emailed_time = user_last_emailed_time_dict.get(to_user, None)
            now = datetime.datetime.now().replace(microsecond=0)
            if not last_emailed_time:
                last_emailed_time = datetime.datetime.now().replace(hour=0).replace(
                                    minute=0).replace(second=0).replace(microsecond=0)
            else:
                if (now - last_emailed_time).total_seconds() < interval_val:
                    continue

            user_notices = list(filter(lambda notice: notice.timestamp > last_emailed_time, notices))
            user_sdoc_notices = list(filter(lambda sdoc_notice: sdoc_notice.created_at > last_emailed_time, sdoc_notices))
            if not user_notices and not user_sdoc_notices:
                continue

            # get and active user language
            user_language = self.get_user_language(to_user)
            translation.activate(user_language)
            logger.info('Set language code to %s for user: %s' % (
                user_language, to_user))
            self.stdout.write('[%s] [INFO] Set language code to %s for user: %s' % (
                str(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')), user_language, to_user))

            # format mail content and send
            notices = []
            for notice in user_notices:
                d = json.loads(notice.detail)
                repo_id = d.get('repo_id')
                group_id = d.get('group_id')
                try:
                    if repo_id and not seafile_api.get_repo(repo_id):
                        notice.delete()
                        continue
                    if group_id and not ccnet_api.get_group(group_id):
                        notice.delete()
                        continue
                except Exception as e:
                    logger.error(e)
                    continue
                if notice.to_user != to_user:
                    continue

                elif notice.is_repo_share_msg():
                    notice = self.format_repo_share_msg(notice)

                elif notice.is_repo_share_to_group_msg():
                    notice = self.format_repo_share_to_group_msg(notice)

                elif notice.is_file_uploaded_msg():
                    notice = self.format_file_uploaded_msg(notice)

                elif notice.is_folder_uploaded_msg():
                    notice = self.format_folder_uploaded_msg(notice)

                elif notice.is_group_join_request():
                    notice = self.format_group_join_request(notice)

                elif notice.is_add_user_to_group():
                    notice = self.format_add_user_to_group(notice)

                elif notice.is_file_comment_msg():
                    notice = self.format_file_comment_msg(notice)

                elif notice.is_guest_invitation_accepted_msg():
                    notice = self.format_guest_invitation_accepted_msg(notice)

                elif notice.is_deleted_files_msg():
                    notice = self.format_deleted_files_msg(notice)

                elif notice.is_repo_monitor_msg():
                    notice = self.format_repo_monitor_msg(notice)

                elif notice.is_saml_sso_error_msg():
                    notice = self.format_saml_sso_error_msg(notice)

                if notice is None:
                    continue

                notices.append(notice)

            for sdoc_notice in user_sdoc_notices:
                if sdoc_notice.username != to_user:
                    continue
                notice = self.format_sdoc_msg(sdoc_queryset, sdoc_notice)
                if notice is None:
                    continue
                notices.append(notice)

            if not notices:
                continue

            user_name = email2nickname(to_user)
            c = {
                'to_user': contact_email,
                'notice_count': len(notices),
                'notices': notices,
                'user_name': user_name,
                }

            try:
                send_html_email(_('New notice on %s') % get_site_name(),
                                'notifications/notice_email.html', c,
                                None, [contact_email])
                # set new last_emailed_time
                UserOptions.objects.set_collaborate_last_emailed_time(to_user, now)
                logger.info('Successfully sent email to %s' % contact_email)
                self.stdout.write('[%s] [INFO] Successfully sent email to %s' % (str(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')), contact_email))
            except Exception as e:
                logger.error('Failed to send email to %s, error detail: %s' % (contact_email, e))
                self.stderr.write('[%s] [ERROR] Failed to send email to %s, error detail: %s' % (str(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')), contact_email, e))

            # restore current language
            translation.activate(cur_language)
