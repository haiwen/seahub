# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import os
import re
import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.urls import reverse
from django.utils.html import escape as e
from django.utils import translation
from django.utils.translation import gettext as _

from seahub.avatar.templatetags.avatar_tags import avatar
from seahub.avatar.util import get_default_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.options.models import (
    UserOptions, KEY_FILE_UPDATES_EMAIL_INTERVAL,
    KEY_FILE_UPDATES_LAST_EMAILED_TIME
)
from seahub.profile.models import Profile
from seahub.utils import (get_site_name, get_user_activities_by_timestamp,
                          send_html_email, get_site_scheme_and_netloc)
from seahub.utils.timeutils import utc_to_local

# Get an instance of a logger
logger = logging.getLogger('file_updates_sender')

# Utility Functions
def td(con):
    return con
    # return '<td>%s</td>' % con


def a_tag(con, href='#', style=''):
    return '<a href="%s" style="%s">%s</a>' % (href, style, e(con))


def repo_url(repo_id, repo_name):
    p = reverse('lib_view', args=[repo_id, repo_name, ''])

    return get_site_scheme_and_netloc() + p


def file_url(repo_id, file_path):
    p = reverse('view_lib_file', args=[repo_id, file_path])
    return get_site_scheme_and_netloc() + p


def dir_url(repo_id, repo_name, dir_path):
    p = reverse('lib_view', args=[repo_id, repo_name, dir_path.strip('/')])

    return get_site_scheme_and_netloc() + p


def user_info_url(username):
    p = reverse('user_profile', args=[username])
    return get_site_scheme_and_netloc() + p


class Command(BaseCommand):
    help = 'Send Email notifications to user if he/she has '
    'file updates notices every period of seconds .'
    label = "notifications_send_file_updates"

    def handle(self, *args, **options):
        logger.info('Start sending file updates emails...')

        self.stdout.write('[%s] Start sending file updates emails...' % str(datetime.now()))
        self.do_action()
        logger.info('Finish sending file updates emails.\n')
        self.stdout.write('[%s] Finish sending file updates emails.\n\n' % str(datetime.now()))

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

    def get_user_language(self, username):
        return Profile.objects.get_user_language(username)

    def format_file_operation(self, ev):
        lib_link = a_tag(ev.repo_name, repo_url(ev.repo_id, ev.repo_name))
        small_lib_link = a_tag(ev.repo_name, repo_url(ev.repo_id, ev.repo_name), 'color:#868e96;font-size:87.5%;')
        if ev.obj_type == 'repo':
            if ev.op_type == 'create':
                op = _('Created library')
                details = td(lib_link)
            elif ev.op_type == 'rename':
                op = _('Renamed library')
                details = td('%s => %s' % (e(ev.old_repo_name), lib_link))
            elif ev.op_type == 'delete':
                op = _('Deleted library')
                details = td(e(ev.repo_name))
            elif ev.op_type == 'recover':
                op = _('Restored library')
                details = td(lib_link)
            else:  # ev.op_type == 'clean-up-trash':
                if ev.days == 0:
                    op = _('Removed all items from trash.')
                else:
                    op = _('Removed items older than %s days from trash.' %
                           ev.days)
                details = td(lib_link)

        elif ev.obj_type == 'file':
            file_name = os.path.basename(ev.path)
            file_link = a_tag(file_name, file_url(ev.repo_id, ev.path))
            if ev.op_type == 'create':
                op = _('Created file')
                details = td("%s<br />%s" % (file_link, small_lib_link))
            elif ev.op_type == 'delete':
                op = _('Deleted file')
                details = td("%s<br />%s" % (e(file_name), small_lib_link))
            elif ev.op_type == 'recover':
                op = _('Restored file')
                details = td("%s<br />%s" % (file_link, small_lib_link))
            elif ev.op_type == 'rename':
                op = _('Renamed file')
                old_name = os.path.basename(ev.old_path)
                details = td("%s => %s<br />%s" % (
                    e(old_name), file_link, small_lib_link)
                )
            elif ev.op_type == 'move':
                op = _('Moved file')
                file_path_link = a_tag(ev.path, file_url(ev.repo_id, ev.path))
                details = td('%s => %s<br />%s' % (
                    e(ev.old_path), file_path_link, small_lib_link)
                )
            else:  # ev.op_type == 'edit':
                op = _('Updated file')
                details = td("%s<br />%s" % (file_link, small_lib_link))

        else:                   # dir
            dir_name = os.path.basename(ev.path)
            dir_link = a_tag(dir_name, dir_url(ev.repo_id, ev.repo_name, ev.path))
            if ev.op_type == 'create':
                op = _('Created folder')
                details = td('%s<br />%s' % (dir_link, small_lib_link))
            elif ev.op_type == 'delete':
                op = _('Deleted folder')
                details = td('%s<br />%s' % (e(dir_name), small_lib_link))
            elif ev.op_type == 'recover':
                op = _('Restored folder')
                details = td('%s<br />%s' % (dir_link, small_lib_link))
            elif ev.op_type == 'rename':
                op = _('Renamed folder')
                old_name = os.path.basename(ev.old_path)
                details = td('%s => %s<br />%s' % (e(old_name), dir_link,
                                                   small_lib_link))
            else:  # ev.op_type == 'move':
                op = _('Moved folder')
                details = td('%s => %s<br />%s' % (e(ev.old_path), dir_link,
                                                   small_lib_link))

        return (op, details)

    def do_action(self):
        emails = []
        user_file_updates_email_intervals = []
        for ele in UserOptions.objects.filter(
                option_key=KEY_FILE_UPDATES_EMAIL_INTERVAL):
            try:
                user_file_updates_email_intervals.append(
                    (ele.email, int(ele.option_val))
                )
                emails.append(ele.email)
            except Exception as e:
                logger.error(e)
                self.stderr.write('[%s] [INFO]: %s' % (str(datetime.now().strftime('%Y-%m-%d %H:%M:%S')), e))
                continue

        user_last_emailed_time_dict = {}
        for ele in UserOptions.objects.filter(
                option_key=KEY_FILE_UPDATES_LAST_EMAILED_TIME).filter(
                    email__in=emails):
            try:
                user_last_emailed_time_dict[ele.email] = datetime.strptime(
                    ele.option_val, "%Y-%m-%d %H:%M:%S")
            except Exception as e:
                logger.error(e)
                self.stderr.write('[%s] [ERROR]: %s' % (str(datetime.now().strftime('%Y-%m-%d %H:%M:%S')), e))
                continue

        for (username, interval_val) in user_file_updates_email_intervals:
            # save current language
            cur_language = translation.get_language()

            # get and active user language
            user_language = self.get_user_language(username)
            translation.activate(user_language)
            logger.info('Set language code to %s for user: %s' % (
                user_language, username))

            self.stdout.write('[%s] [INFO] Set language code to %s for user: %s' % (
                str(datetime.now().strftime('%Y-%m-%d %H:%M:%S')), user_language, username))

            # get last_emailed_time if any, defaults to today 00:00:00
            last_emailed_time = user_last_emailed_time_dict.get(username, None)
            now = datetime.utcnow().replace(microsecond=0)
            if not last_emailed_time:
                last_emailed_time = datetime.utcnow().replace(hour=0).replace(
                                    minute=0).replace(second=0).replace(microsecond=0)
            else:
                if (now - last_emailed_time).total_seconds() < interval_val:
                    continue

                # to avoid slow queries caused by retrieving too much data,
                # only get file changes within the past week.
                if (now - last_emailed_time).total_seconds() > 7 * 86400:
                    last_emailed_time = now - timedelta(days=7)

            # get file updates(from: last_emailed_time, to: now) for repos
            # user can access
            res = get_user_activities_by_timestamp(username, last_emailed_time, now)
            if not res:
                UserOptions.objects.set_file_updates_last_emailed_time(username, now)
                continue

            # remove my activities
            res = [x for x in res if x.op_user != username]
            if not res:
                UserOptions.objects.set_file_updates_last_emailed_time(username, now)
                continue

            # format mail content & send file updates email to user
            try:
                for ele in res:
                    ele.user_avatar = self.get_avatar_src(ele.op_user)
                    ele.local_timestamp = utc_to_local(ele.timestamp)
                    ele.op_user_link = a_tag(email2nickname(ele.op_user),
                                             user_info_url(ele.op_user))
                    ele.operation, ele.op_details = self.format_file_operation(ele)
            except Exception as e:
                logger.error('Failed to format mail content for user: %s' %
                             username)
                logger.error(e, exc_info=True)
                self.stderr.write('[%s] [ERROR] Failed to format mail content for user: %s' %
                                    (str(datetime.now().strftime('%Y-%m-%d %H:%M:%S')), username))
                self.stderr.write('[%s] [ERROR]: %s' % (str(datetime.now().strftime('%Y-%m-%d %H:%M:%S')), e))
                continue

            nickname = email2nickname(username)
            contact_email = Profile.objects.get_contact_email_by_user(username)

            c = {
                'name': nickname,
                'updates_count': len(res),
                'updates': res,
            }

            try:
                send_html_email(_('New file updates on %s') % get_site_name(),
                                'notifications/file_updates_email.html', c,
                                None, [contact_email])
                # set new last_emailed_time
                UserOptions.objects.set_file_updates_last_emailed_time(username, now)
                self.stdout.write('[%s] [INFO] Successful to send email to %s' %
                                    (str(datetime.now().strftime('%Y-%m-%d %H:%M:%S')), contact_email))
            except Exception as e:
                logger.error('Failed to send email to %s, error detail: %s' %
                             (contact_email, e))
                self.stderr.write('[%s] [ERROR] Failed to send email to %s, error '
                                    'detail: %s' % (str(datetime.now().strftime('%Y-%m-%d %H:%M:%S')), contact_email, e))
            finally:
                # reset lang
                translation.activate(cur_language)
