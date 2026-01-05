# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import datetime
import os
import json
import logging

from django.urls import reverse
from django.db import models
from django.conf import settings
from django.forms import ModelForm, Textarea
from django.utils.html import escape, urlize
from django.utils.translation import gettext as _
from django.core.cache import cache
from django.template.loader import render_to_string

from seaserv import seafile_api, ccnet_api

from seahub.base.fields import LowerCaseCharField
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.invitations.models import Invitation
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils import normalize_cache_key, get_site_scheme_and_netloc
from seahub.constants import HASH_URLS
from seahub.file_participants.utils import list_file_participants

# Get an instance of a logger
logger = logging.getLogger(__name__)


class NotificationManager(models.Manager):
    def create_sys_notification(self, message, is_primary=False):
        """
        Creates and saves a system notification.
        """
        notification = Notification()
        notification.message = message
        notification.primary = is_primary
        notification.save()

        return notification


########## system notification
class Notification(models.Model):
    """
        global system notification
    """
    message = models.CharField(max_length=512)
    primary = models.BooleanField(default=False, db_index=True)
    objects = NotificationManager()

    def update_notification_to_current(self):
        self.primary = 1
        self.save()

class NotificationForm(ModelForm):
    """
    Form for adding notification.
    """
    class Meta:
        model = Notification
        fields = ('message', 'primary')
        widgets = {
            'message': Textarea(),
        }


class SysUserNotificationManager(models.Manager):
    def create_sys_user_notificatioin(self, msg, user):
        notification = self.create(
            message = msg,
            to_user = user,
        )
        return notification

    def unseen_notes(self, user):
        notes = self.filter(to_user=user, seen=0)
        return notes


class SysUserNotification(models.Model):
    """
    system notification to designated user
    """
    message = models.TextField(null=False, blank=False)
    to_user = models.CharField(max_length=255, db_index=True)
    seen = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    objects = SysUserNotificationManager()

    class Meta:
        ordering = ["-created_at"]

    def update_notification_to_seen(self):
        self.seen = True
        self.save()

    @property
    def format_msg(self):
        return urlize(self.message, autoescape=True)

    def to_dict(self):
        email = self.to_user
        orgs = ccnet_api.get_orgs_by_user(email)
        org_name = ''
        try:
            if orgs:
                org_name = orgs[0].org_name
        except Exception as e:
            logger.error(e)
        return {
            'id': self.id,
            'msg': self.message,
            'username': self.to_user,
            'name': email2nickname(self.to_user),
            'contact_email': email2contact_email(self.to_user),
            'seen': self.seen,
            'org_name': org_name,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'msg_format': self.format_msg
        }

########## user notification
MSG_TYPE_GROUP_JOIN_REQUEST = 'group_join_request'
MSG_TYPE_ADD_USER_TO_GROUP = 'add_user_to_group'
MSG_TYPE_FILE_UPLOADED = 'file_uploaded'
MSG_TYPE_FOLDER_UPLOADED = 'folder_uploaded'
MSG_TYPE_REPO_SHARE = 'repo_share'
MSG_TYPE_REPO_SHARE_PERM_CHANGE = 'repo_share_perm_change'
MSG_TYPE_REPO_SHARE_PERM_DELETE = 'repo_share_perm_delete'
MSG_TYPE_REPO_SHARE_TO_GROUP = 'repo_share_to_group'
MSG_TYPE_USER_MESSAGE = 'user_message'
MSG_TYPE_FILE_COMMENT = 'file_comment'
MSG_TYPE_DRAFT_COMMENT = 'draft_comment'
MSG_TYPE_DRAFT_REVIEWER = 'draft_reviewer'
MSG_TYPE_GUEST_INVITATION_ACCEPTED = 'guest_invitation_accepted'
MSG_TYPE_REPO_TRANSFER = 'repo_transfer'
MSG_TYPE_REPO_MINOTOR = 'repo_monitor'
MSG_TYPE_DELETED_FILES = 'deleted_files'
MSG_TYPE_SAML_SSO_FAILED = 'saml_sso_failed'
MSG_TYPE_FACE_CLUSTER = 'face_cluster'
MSG_TYPE_REPO_ARCHIVED = 'repo_archived'
MSG_TYPE_REPO_UNARCHIVED = 'repo_unarchived'
MSG_TYPE_REPO_ARCHIVE_FAILED = 'repo_archive_failed'
MSG_TYPE_REPO_UNARCHIVE_FAILED = 'repo_unarchive_failed'


def file_uploaded_msg_to_json(file_name, repo_id, uploaded_to):
    """Encode file uploaded message to json string.
    """
    return json.dumps({'file_name': file_name, 'repo_id': repo_id,
                       'uploaded_to': uploaded_to})

def folder_uploaded_msg_to_json(folder_name, repo_id, uploaded_to):
    """Encode folder uploaded message to json string.
    """
    return json.dumps({'folder_name': folder_name, 'repo_id': repo_id,
                       'uploaded_to': uploaded_to})

def repo_share_msg_to_json(share_from, repo_id, path, org_id):
    return json.dumps({'share_from': share_from, 'repo_id': repo_id,
                       'path': path, 'org_id': org_id})

def repo_share_perm_change_msg_to_json(share_from, repo_id, path, org_id, perm):
    return json.dumps({'share_from': share_from, 'repo_id': repo_id,
                       'path': path, 'org_id': org_id, 'permission': perm})

def repo_share_perm_delete_msg_to_json(share_from, repo_id, path, org_id):
    return json.dumps({'share_from': share_from, 'repo_id': repo_id,
                       'path': path, 'org_id': org_id})

def repo_share_to_group_msg_to_json(share_from, repo_id, group_id, path, org_id):
    return json.dumps({'share_from': share_from, 'repo_id': repo_id,
                       'group_id': group_id, 'path': path, 'org_id': org_id})

def group_msg_to_json(group_id, msg_from, message):
    return json.dumps({'group_id': group_id, 'msg_from': msg_from,
                       'message': message})

def user_msg_to_json(message, msg_from):
    return json.dumps({'message': message, 'msg_from': msg_from})

def group_join_request_to_json(username, group_id, join_request_msg):
    return json.dumps({'username': username, 'group_id': group_id,
                       'join_request_msg': join_request_msg})

def add_user_to_group_to_json(group_staff, group_id):
    return json.dumps({'group_staff': group_staff,
                       'group_id': group_id})

def file_comment_msg_to_json(repo_id, file_path, author, comment):
    return json.dumps({'repo_id': repo_id,
                       'file_path': file_path,
                       'author': author,
                       'comment': comment})

def draft_comment_msg_to_json(draft_id, author, comment):
    return json.dumps({'draft_id': draft_id,
                       'author': author,
                       'comment': comment})

def request_reviewer_msg_to_json(draft_id, from_user, to_user):
    return json.dumps({'draft_id': draft_id,
                       'from_user': from_user,
                       'to_user': to_user})

def guest_invitation_accepted_msg_to_json(invitation_id):
    return json.dumps({'invitation_id': invitation_id})

def repo_transfer_msg_to_json(org_id, repo_owner, repo_id, repo_name):
    """Encode repo transfer message to json string.
    """
    return json.dumps({'org_id': org_id, 'repo_owner': repo_owner,
        'repo_id': repo_id, 'repo_name': repo_name})


def saml_sso_error_msg_to_json(error_msg):
    return json.dumps({'error_msg': error_msg})


class UserNotificationManager(models.Manager):
    def _add_user_notification(self, to_user, msg_type, detail):
        """Add generic user notification.

        Arguments:
        - `self`:
        - `username`:
        - `detail`:
        """
        n = super(UserNotificationManager, self).create(
            to_user=to_user, msg_type=msg_type, detail=detail)
        n.save()

        return n

    def get_all_notifications(self, seen=None, time_since=None):
        """Get all notifications of all users.

        Arguments:
        - `self`:
        - `seen`:
        - `time_since`:
        """
        qs = super(UserNotificationManager, self).all()
        if seen is not None:
            qs = qs.filter(seen=seen)
        if time_since is not None:
            qs = qs.filter(timestamp__gt=time_since)
        return qs

    def get_user_notifications(self, username, seen=None):
        """Get all notifications(group_msg, grpmsg_reply, etc) of a user.

        Arguments:
        - `self`:
        - `username`:
        """
        qs = super(UserNotificationManager, self).filter(to_user=username)
        if seen is not None:
            qs = qs.filter(seen=seen)
        return qs

    def remove_user_notifications(self, username):
        """Remove all user notifications.

        Arguments:
        - `self`:
        - `username`:
        """
        self.get_user_notifications(username).delete()

    def count_unseen_user_notifications(self, username):
        """

        Arguments:
        - `self`:
        - `username`:
        """
        return super(UserNotificationManager, self).filter(
            to_user=username, seen=False).count()

    def seen_user_msg_notices(self, to_user, from_user):
        """Mark priv message notices of a user as seen.
        """
        user_notices = super(UserNotificationManager, self).filter(
            to_user=to_user, seen=False, msg_type=MSG_TYPE_USER_MESSAGE)
        for notice in user_notices:
            notice_from_user = notice.user_message_detail_to_dict().get('msg_from')
            if from_user == notice_from_user:
                if notice.seen is False:
                    notice.seen = True
                    notice.save()

    def add_group_join_request_notice(self, to_user, detail):
        """

        Arguments:
        - `self`:
        - `to_user`:
        - `detail`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_GROUP_JOIN_REQUEST, detail)

    def set_add_user_to_group_notice(self, to_user, detail):
        """

        Arguments:
        - `self`:
        - `to_user`:
        - `detail`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_ADD_USER_TO_GROUP,
                                           detail)

    def add_file_uploaded_msg(self, to_user, detail):
        """

        Arguments:
        - `self`:
        - `to_user`:
        - `file_name`:
        - `upload_to`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_FILE_UPLOADED, detail)

    def add_folder_uploaded_msg(self, to_user, detail):
        """

        Arguments:
        - `self`:
        - `to_user`:
        - `folder_name`:
        - `upload_to`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_FOLDER_UPLOADED, detail)

    def add_repo_share_msg(self, to_user, detail):
        """Notify ``to_user`` that others shared a repo to him/her.

        Arguments:
        - `self`:
        - `to_user`:
        - `repo_id`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_REPO_SHARE, detail)

    def add_repo_share_perm_change_msg(self, to_user, detail):
        return self._add_user_notification(to_user, MSG_TYPE_REPO_SHARE_PERM_CHANGE, detail)

    def add_repo_share_perm_delete_msg(self, to_user, detail):
        return self._add_user_notification(to_user, MSG_TYPE_REPO_SHARE_PERM_DELETE, detail)


    def add_repo_share_to_group_msg(self, to_user, detail):
        """Notify ``to_user`` that others shared a repo to group.

        Arguments:
        - `self`:
        - `to_user`:
        - `detail`:
        """
        return self._add_user_notification(to_user,
                   MSG_TYPE_REPO_SHARE_TO_GROUP, detail)

    def add_user_message(self, to_user, detail):
        """Notify ``to_user`` that others sent a message to him/her.

        Arguments:
        - `self`:
        - `to_user`:
        - `detail`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_USER_MESSAGE, detail)

    def add_file_comment_msg(self, to_user, detail):
        """Notify ``to_user`` that others comment a file he can access.
        """
        return self._add_user_notification(to_user, MSG_TYPE_FILE_COMMENT, detail)

    def add_draft_comment_msg(self, to_user, detail):
        """Notify ``to_user`` that review creator
        """
        return self._add_user_notification(to_user, MSG_TYPE_DRAFT_COMMENT, detail)

    def add_request_reviewer_msg(self, to_user, detail):
        """Notify ``to_user`` that reviewer
        """
        return self._add_user_notification(to_user, MSG_TYPE_DRAFT_REVIEWER, detail)

    def add_guest_invitation_accepted_msg(self, to_user, detail):
        """Nofity ``to_user`` that a guest has accpeted an invitation.
        """
        return self._add_user_notification(
            to_user, MSG_TYPE_GUEST_INVITATION_ACCEPTED, detail)

    def add_repo_transfer_msg(self, to_user, detail):
        """Nofity ``to_user`` that a library has been transferred to him/her.
        """
        return self._add_user_notification(
            to_user, MSG_TYPE_REPO_TRANSFER, detail)

    def add_saml_sso_error_msg(self, to_user, detail):
        """Notify ``to_user`` that saml sso occurred an error
        """
        return self._add_user_notification(to_user, MSG_TYPE_SAML_SSO_FAILED, detail)


class UserNotification(models.Model):
    to_user = LowerCaseCharField(db_index=True, max_length=255)
    msg_type = models.CharField(db_index=True, max_length=30)
    detail = models.TextField()
    timestamp = models.DateTimeField(db_index=True, default=datetime.datetime.now)
    seen = models.BooleanField('seen', default=False)
    objects = UserNotificationManager()

    class InvalidDetailError(Exception):
        pass

    class Meta:
        ordering = ["-timestamp"]

    def __unicode__(self):
        return '%s|%s|%s' % (self.to_user, self.msg_type, self.detail)

    def is_seen(self):
        """Returns value of ``self.seen`` but also changes it to ``True``.

        Use this in a template to mark an unseen notice differently the first
        time it is shown.

        Arguments:
        - `self`:
        """
        seen = self.seen
        if seen is False:
            self.seen = True
            self.save()
        return seen

    def is_file_uploaded_msg(self):
        """

        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_FILE_UPLOADED

    def is_folder_uploaded_msg(self):
        """

        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_FOLDER_UPLOADED

    def is_repo_share_msg(self):
        """

        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_REPO_SHARE

    def is_repo_share_perm_change_msg(self):
        return self.msg_type == MSG_TYPE_REPO_SHARE_PERM_CHANGE

    def is_repo_share_perm_delete_msg(self):
        return self.msg_type == MSG_TYPE_REPO_SHARE_PERM_DELETE

    def is_repo_share_to_group_msg(self):
        """

        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_REPO_SHARE_TO_GROUP

    def is_user_message(self):
        """

        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_USER_MESSAGE

    def is_group_join_request(self):
        """

        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_GROUP_JOIN_REQUEST

    def is_add_user_to_group(self):
        """

        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_ADD_USER_TO_GROUP

    def is_file_comment_msg(self):
        return self.msg_type == MSG_TYPE_FILE_COMMENT

    def is_draft_comment_msg(self):
        return self.msg_type == MSG_TYPE_DRAFT_COMMENT

    def is_draft_reviewer_msg(self):
        return self.msg_type == MSG_TYPE_DRAFT_REVIEWER

    def is_guest_invitation_accepted_msg(self):
        return self.msg_type == MSG_TYPE_GUEST_INVITATION_ACCEPTED

    def is_repo_transfer_msg(self):
        return self.msg_type == MSG_TYPE_REPO_TRANSFER

    def is_repo_monitor_msg(self):
        return self.msg_type == MSG_TYPE_REPO_MINOTOR

    def is_deleted_files_msg(self):
        return self.msg_type == MSG_TYPE_DELETED_FILES

    def is_saml_sso_error_msg(self):
        return self.msg_type == MSG_TYPE_SAML_SSO_FAILED

    def is_face_cluster_msg(self):
        return self.msg_type == MSG_TYPE_FACE_CLUSTER

    def is_repo_archived_msg(self):
        return self.msg_type == MSG_TYPE_REPO_ARCHIVED

    def is_repo_unarchived_msg(self):
        return self.msg_type == MSG_TYPE_REPO_UNARCHIVED

    def is_repo_archive_failed_msg(self):
        return self.msg_type == MSG_TYPE_REPO_ARCHIVE_FAILED

    def is_repo_unarchive_failed_msg(self):
        return self.msg_type == MSG_TYPE_REPO_UNARCHIVE_FAILED

    def user_message_detail_to_dict(self):
        """Parse user message detail, returns dict contains ``message`` and
        ``msg_from``.

        Arguments:
        - `self`:

        """
        assert self.is_user_message()

        try:
            detail = json.loads(self.detail)
        except ValueError:
            msg_from = self.detail
            message = None
            return {'message': message, 'msg_from': msg_from}
        else:
            message = detail['message']
            msg_from = detail['msg_from']
            return {'message': message, 'msg_from': msg_from}

    ########## functions used in templates
    def format_msg(self):
        if self.is_file_uploaded_msg():
            return self.format_file_uploaded_msg()
        if self.is_folder_uploaded_msg():
            return self.format_folder_uploaded_msg()
        elif self.is_repo_share_msg():
            return self.format_repo_share_msg()
        elif self.is_repo_share_to_group_msg():
            return self.format_repo_share_to_group_msg()
        elif self.is_group_join_request():
            return self.format_group_join_request()
        elif self.is_file_comment_msg():
            return self.format_file_comment_msg()
        elif self.is_draft_comment_msg():
            return self.format_draft_comment_msg()
        elif self.is_draft_reviewer_msg():
            return self.format_draft_reviewer_msg()
        elif self.is_guest_invitation_accepted_msg():
            return self.format_guest_invitation_accepted_msg()
        elif self.is_add_user_to_group():
            return self.format_add_user_to_group()
        elif self.is_repo_transfer_msg():
            return self.format_repo_transfer_msg()
        elif self.is_repo_monitor_msg():
            return self.format_repo_monitor_msg()
        elif self.is_face_cluster_msg():
            return self.format_face_cluster_msg()
        elif self.is_repo_archived_msg():
            return self.format_repo_archived_msg()
        elif self.is_repo_unarchived_msg():
            return self.format_repo_unarchived_msg()
        else:
            return ''

    def format_file_uploaded_msg(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        filename = d['file_name']
        repo_id = d['repo_id']
        repo = seafile_api.get_repo(repo_id)
        if repo:
            if d['uploaded_to'] == '/':
                # current upload path is '/'
                file_path = '/' + filename
                link = reverse('lib_view', args=[repo_id, repo.name, ''])
                name = repo.name
            else:
                uploaded_to = d['uploaded_to'].rstrip('/')
                file_path = uploaded_to + '/' + filename
                link = reverse('lib_view', args=[repo_id, repo.name, uploaded_to.lstrip('/')])
                name = os.path.basename(uploaded_to)
            file_link = reverse('view_lib_file', args=[repo_id, file_path])

            msg = _("A file named <a href='%(file_link)s'>%(file_name)s</a> is uploaded to <a href='%(link)s'>%(name)s</a>") % {
                'file_link': file_link,
                'file_name': escape(filename),
                'link': link,
                'name': escape(name),
                }
        else:
            msg = _("A file named <strong>%(file_name)s</strong> is uploaded") % {
                'file_name': escape(filename),
                }

        return msg

    def format_folder_uploaded_msg(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        foldername = d['folder_name']
        repo_id = d['repo_id']
        repo = seafile_api.get_repo(repo_id)
        if repo:
            if d['uploaded_to'] == '/':
                # current upload path is '/'
                folder_path = '/' + foldername
                link = reverse('lib_view', args=[repo_id, repo.name, ''])
                name = repo.name
            else:
                uploaded_to = d['uploaded_to'].rstrip('/')
                folder_path = uploaded_to + '/' + foldername
                link = reverse('lib_view', args=[repo_id, repo.name, uploaded_to.lstrip('/')])
                name = os.path.basename(uploaded_to)

            folder_link = reverse('lib_view', args=[repo_id, repo.name, folder_path])

            msg = _("A folder named <a href='%(folder_link)s'>%(folder_name)s</a> is uploaded to <a href='%(link)s'>%(name)s</a>") % {
                'folder_link': folder_link,
                'folder_name': escape(foldername),
                'link': link,
                'name': escape(name),
                }
        else:
            msg = _("A folder named <strong>%(folder_name)s</strong> is uploaded") % {
                'folder_name': escape(foldername),
                }

        return msg

    def format_repo_share_msg(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        share_from = email2nickname(d['share_from'])
        repo_id = d['repo_id']
        path = d.get('path', '/')
        org_id = d.get('org_id', None)
        repo = None
        try:
            if path == '/':
                repo = seafile_api.get_repo(repo_id)
            else:
                if org_id:
                    owner = seafile_api.get_org_repo_owner(repo_id)
                    repo = seafile_api.get_org_virtual_repo(
                        org_id, repo_id, path, owner)
                else:
                    owner = seafile_api.get_repo_owner(repo_id)
                    repo = seafile_api.get_virtual_repo(repo_id, path, owner)

        except Exception as e:
            logger.error(e)
            return None

        if repo is None:
            self.delete()
            return None

        if path == '/':
            tmpl = 'notifications/notice_msg/repo_share_msg.html'
        else:
            tmpl = 'notifications/notice_msg/folder_share_msg.html'

        lib_url = reverse('lib_view', args=[repo.id, repo.name, ''])
        msg = render_to_string(tmpl, {
            'user': share_from,
            'lib_url': lib_url,
            'lib_name': repo.name,
        })

        return msg

    def format_repo_share_to_group_msg(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        share_from = email2nickname(d['share_from'])
        repo_id = d['repo_id']
        group_id = d['group_id']
        path = d.get('path', '/')
        org_id = d.get('org_id', None)

        repo = None
        try:
            group = ccnet_api.get_group(group_id)
            if path == '/':
                repo = seafile_api.get_repo(repo_id)
            else:
                if org_id:
                    owner = seafile_api.get_org_repo_owner(repo_id)
                    repo = seafile_api.get_org_virtual_repo(
                        org_id, repo_id, path, owner)
                else:
                    owner = seafile_api.get_repo_owner(repo_id)
                    repo = seafile_api.get_virtual_repo(repo_id, path, owner)
        except Exception as e:
            logger.error(e)
            return None

        if not repo or not group:
            self.delete()
            return None

        if path == '/':
            tmpl = 'notifications/notice_msg/repo_share_to_group_msg.html'
        else:
            tmpl = 'notifications/notice_msg/folder_share_to_group_msg.html'

        lib_url = reverse('lib_view', args=[repo.id, repo.name, ''])
        group_url = reverse('group', args=[group.id])
        msg = render_to_string(tmpl, {
            'user': share_from,
            'lib_url': lib_url,
            'lib_name': repo.name,
            'group_url': group_url,
            'group_name': group.group_name,
        })

        return msg

    def format_group_join_request(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        username = d['username']
        group_id = d['group_id']
        join_request_msg = d['join_request_msg']

        group = ccnet_api.get_group(group_id)
        if group is None:
            self.delete()
            return None

        msg = _("User <a href='%(user_profile)s'>%(username)s</a> has asked to join group <a href='%(href)s'>%(group_name)s</a>, verification message: %(join_request_msg)s") % {
            'user_profile': reverse('user_profile', args=[username]),
            'username': username,
            'href': HASH_URLS['GROUP_MEMBERS'] % {'group_id': group_id},
            'group_name': escape(group.group_name),
            'join_request_msg': escape(join_request_msg),
        }
        return msg

    def format_repo_archived_msg(self):
        try:
            d = json.loads(self.detail)
            repo_name = d['repo_name']
            repo_id = d['repo_id']
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        repo = seafile_api.get_repo(repo_id)
        if repo:
            lib_url = reverse('lib_view', args=[repo.id, repo.name, ''])
            msg = _("Library <a href='%(lib_url)s'>%(repo_name)s</a> has been archived.") % {
                'lib_url': lib_url,
                'repo_name': escape(repo_name)
            }
        else:
            msg = _("Library %(repo_name)s has been archived.") % {
                'repo_name': escape(repo_name)
            }
        return msg

    def format_repo_unarchived_msg(self):
        try:
            d = json.loads(self.detail)
            repo_name = d['repo_name']
            repo_id = d['repo_id']
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")
            
        repo = seafile_api.get_repo(repo_id)
        if repo:
            lib_url = reverse('lib_view', args=[repo.id, repo.name, ''])
            msg = _("Library <a href='%(lib_url)s'>%(repo_name)s</a> has been unarchived.") % {
                'lib_url': lib_url,
                'repo_name': escape(repo_name)
            }
        else:
            msg = _("Library %(repo_name)s has been unarchived.") % {
                'repo_name': escape(repo_name)
            }
        return msg

    def format_repo_archive_failed_msg(self):
        try:
            d = json.loads(self.detail)
            repo_name = d['repo_name']
            repo_id = d['repo_id']
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        repo = seafile_api.get_repo(repo_id)
        if repo:
            lib_url = reverse('lib_view', args=[repo.id, repo.name, ''])
            msg = _("Library <a href='%(lib_url)s'>%(repo_name)s</a> archive failed.") % {
                'lib_url': lib_url,
                'repo_name': escape(repo_name)
            }
        else:
            msg = _("Library %(repo_name)s archive failed.") % {
                'repo_name': escape(repo_name)
            }
        return msg

    def format_repo_unarchive_failed_msg(self):
        try:
            d = json.loads(self.detail)
            repo_name = d['repo_name']
            repo_id = d['repo_id']
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        repo = seafile_api.get_repo(repo_id)
        if repo:
            lib_url = reverse('lib_view', args=[repo.id, repo.name, ''])
            msg = _("Library <a href='%(lib_url)s'>%(repo_name)s</a> unarchive failed.") % {
                'lib_url': lib_url,
                'repo_name': escape(repo_name)
            }
        else:
            msg = _("Library %(repo_name)s unarchive failed.") % {
                'repo_name': escape(repo_name)
            }
        return msg

    def format_add_user_to_group(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        group_staff = d['group_staff']
        group_id = d['group_id']

        group = ccnet_api.get_group(group_id)
        if group is None:
            self.delete()
            return None

        msg = _("User <a href='%(user_profile)s'>%(group_staff)s</a> has added you to group <a href='%(href)s'>%(group_name)s</a>") % {
            'user_profile': reverse('user_profile', args=[group_staff]),
            'group_staff': escape(email2nickname(group_staff)),
            'href': reverse('group', args=[group_id]),
            'group_name': escape(group.group_name)}
        return msg

    def format_file_comment_msg(self):
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        repo_id = d['repo_id']
        file_path = d['file_path']
        author = d['author']
        comment = d['comment']

        repo = seafile_api.get_repo(repo_id)
        if repo is None or not seafile_api.get_file_id_by_path(repo.id,
                                                               file_path):
            self.delete()
            return None

        file_name = os.path.basename(file_path)
        msg = _("File <a href='%(file_url)s'>%(file_name)s</a> has a new comment from user %(author)s") % {
            'file_url': reverse('view_lib_file', args=[repo_id, file_path]),
            'file_name': escape(file_name),
            'author': escape(email2nickname(author)),
        }
        return msg

    def format_draft_comment_msg(self):
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        draft_id = d['draft_id']
        author = d['author']

        msg = _("<a href='%(file_url)s'>Draft #%(draft_id)s</a> has a new comment from user %(author)s") % {
            'draft_id': draft_id,
            'file_url': reverse('drafts:draft', args=[draft_id]),
            'author': escape(email2nickname(author)),
        }
        return msg

    def format_draft_reviewer_msg(self):
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        draft_id = d['draft_id']
        from_user = d['from_user']

        msg = _("%(from_user)s has sent you a request for <a href='%(file_url)s'>draft #%(draft_id)s</a>") % {
            'draft_id': draft_id,
            'file_url': reverse('drafts:draft', args=[draft_id]),
            'from_user': escape(email2nickname(from_user))
        }
        return msg

    def format_guest_invitation_accepted_msg(self):
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        inv_id = d['invitation_id']
        try:
            inv = Invitation.objects.get(pk=inv_id)
        except Invitation.DoesNotExist:
            self.delete()
            return

        # Use same msg as in notice_email.html, so there will be only one msg
        # in django.po.
        msg = _('Guest %(user)s accepted your <a href="%(url_base)s%(inv_url)s">invitation</a> at %(time)s.') % {
            'user': inv.accepter,
            'url_base': '',
            'inv_url': settings.SITE_ROOT + '#invitations/',
            'time': inv.accept_time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        return msg

    def format_repo_transfer_msg(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _("Internal Server Error")

        repo_owner_name = email2nickname(d['repo_owner'])
        repo_id = d['repo_id']
        repo_name = d['repo_name']
        repo_url = reverse('lib_view', args=[repo_id, repo_name, ''])
        msg = _('%(user)s has transferred a library named <a href="%(repo_url)s">%(repo_name)s</a> to you.') % {
            'user': repo_owner_name,
            'repo_url': repo_url,
            'repo_name': repo_name,
        }
        return msg

    def format_repo_monitor_msg(self):
        """

        Arguments:
        - `self`:
        """
        # {'commit_id': '5a52250eec53f32e771e7e032e5a40fd33143610',
        #  'repo_id': 'b37d325a-5e72-416b-aa36-10643cee2f42',
        #  'repo_name': 'lib of lian@seafile.com',
        #  'op_user': 'lian@lian.com',
        #  'op_type': 'create',
        #  'obj_type': 'file',
        #  'obj_path_list': ['/sdf.md'],
        #  'old_obj_path_list': []}

        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return ""

        repo_id = d['repo_id']
        repo_name = escape(d['repo_name'])
        name = escape(email2nickname(d['op_user']))

        op_type = d['op_type']

        obj_type = _('file') if d['obj_type'] == 'file' else _('folder')
        obj_path_list = d['obj_path_list']
        obj_path = obj_path_list[0]
        obj_name = escape(os.path.basename(obj_path))

        obj_path_count = len(obj_path_list)
        obj_path_count_minus_one = len(obj_path_list) - 1

        old_obj_path_list = d.get('old_obj_path_list', [])
        if old_obj_path_list:
            old_obj_name = os.path.basename(d['old_obj_path_list'][0])
        else:
            old_obj_name = ''

        def get_repo_url(repo_id, repo_name):
            p = reverse('lib_view', args=[repo_id, repo_name, ''])
            return get_site_scheme_and_netloc() + p

        def get_file_url(repo_id, file_path):
            p = reverse('view_lib_file', args=[repo_id, file_path])
            return get_site_scheme_and_netloc() + p

        def get_dir_url(repo_id, repo_name, dir_path):
            p = reverse('lib_view', args=[repo_id, repo_name, dir_path.strip('/')])
            return get_site_scheme_and_netloc() + p

        repo_url = get_repo_url(repo_id, repo_name)
        repo_link = f'<a href="{repo_url}">{repo_name}</a>'

        if obj_type == 'file':
            file_url = get_file_url(repo_id, obj_path)
            obj_link = f'<a href="{file_url}">{obj_name}</a>'
        else:
            folder_url = get_dir_url(repo_id, repo_name, obj_path)
            obj_link = f'<a href="{folder_url}">{obj_name}</a>'

        if op_type == 'create':

            if obj_path_count == 1:
                message = _(f'{name} created {obj_type} {obj_link} in library {repo_link}.')
            else:
                message = _(f'{name} created {obj_type} {obj_link} and {obj_path_count_minus_one} other {obj_type}(s) in library {repo_link}.')

        elif op_type == 'delete':

            if obj_path_count == 1:
                message = _(f'{name} deleted {obj_type} {obj_name} in library {repo_link}.')
            else:
                message = _(f'{name} deleted {obj_type} {obj_name} and {obj_path_count_minus_one} other {obj_type}(s) in library {repo_link}.')

        elif op_type == 'recover':

            message = _(f'{name} restored {obj_type} {obj_link} in library {repo_link}.')

        elif op_type == 'rename':

            message = _(f'{name} renamed {obj_type} {old_obj_name} to {obj_link} in library {repo_link}.')

        elif op_type == 'move':

            if obj_path_count == 1:
                message = _(f'{name} moved {obj_type} {obj_link} in library {repo_link}.')
            else:
                message = _(f'{name} moved {obj_type} {obj_link} and {obj_path_count_minus_one} other {obj_type}(s) in library {repo_link}.')

        elif op_type == 'edit':

            message = _(f'{name} updated {obj_type} {obj_link} in library {repo_link}.')

        else:
            message = _(f'{name} {op_type} {obj_type} {obj_link} in library {repo_link}.')

        return message

    def format_face_cluster_msg(self):
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return ""
        repo_name = d.get('repo_name')
        message = _(f'Face recognition is done for library {repo_name}.')
        return message


########## handle signals
from django.dispatch import receiver

from seahub.signals import upload_file_successful, upload_folder_successful, repo_transfer
from seahub.group.signals import group_join_request, add_user_to_group
from seahub.share.signals import share_repo_to_user_successful, \
    share_repo_to_group_successful, change_repo_perm_successful, delete_repo_perm_successful
from seahub.invitations.signals import accept_guest_invitation_successful
from seahub.adfs_auth.signals import saml_sso_failed


@receiver(upload_file_successful)
def add_upload_file_msg_cb(sender, **kwargs):
    """Notify repo owner when others upload files to his/her folder from shared link.
    """
    repo_id = kwargs.get('repo_id', None)
    file_path = kwargs.get('file_path', None)
    owner = kwargs.get('owner', None)

    assert repo_id and file_path and owner is not None, 'Arguments error'

    filename = os.path.basename(file_path)
    folder_path = os.path.dirname(file_path)

    detail = file_uploaded_msg_to_json(filename, repo_id, folder_path)
    UserNotification.objects.add_file_uploaded_msg(owner, detail)


@receiver(upload_folder_successful)
def add_upload_folder_msg_cb(sender, **kwargs):
    """Notify repo owner when others upload folder to his/her folder from shared link.
    """
    repo_id = kwargs.get('repo_id', None)
    folder_path = kwargs.get('folder_path', None)
    owner = kwargs.get('owner', None)

    assert repo_id and folder_path and owner is not None, 'Arguments error'

    folder_name = os.path.basename(folder_path.rstrip('/'))
    parent_dir = os.path.dirname(folder_path.rstrip('/'))
    detail = folder_uploaded_msg_to_json(folder_name, repo_id, parent_dir)
    UserNotification.objects.add_folder_uploaded_msg(owner, detail)


@receiver(share_repo_to_user_successful)
def add_share_repo_msg_cb(sender, **kwargs):
    """Notify user when others share repos to him/her.
    """
    from_user = kwargs.get('from_user', None)
    to_user = kwargs.get('to_user', None)
    repo = kwargs.get('repo', None)
    path = kwargs.get('path', None)
    org_id = kwargs.get('org_id', None)

    assert from_user and to_user and repo and path is not None, 'Arguments error'

    detail = repo_share_msg_to_json(from_user, repo.id, path, org_id)
    UserNotification.objects.add_repo_share_msg(to_user, detail)

@receiver(change_repo_perm_successful)
def add_modify_share_repo_msg_cb(sender, **kwargs):
    from_user = kwargs.get('from_user', None)
    to_user = kwargs.get('to_user', None)
    repo = kwargs.get('repo', None)
    path = kwargs.get('path', None)
    org_id = kwargs.get('org_id', None)
    permission = kwargs.get('permission', None)

    assert from_user and to_user and repo and path and permission is not None, 'Arguments error'

    detail = repo_share_perm_change_msg_to_json(from_user, repo.id, path, org_id, permission)
    UserNotification.objects.add_repo_share_perm_change_msg(to_user, detail)

@receiver(delete_repo_perm_successful)
def add_delete_share_repo_msg_cb(sender, **kwargs):
    from_user = kwargs.get('from_user', None)
    to_user = kwargs.get('to_user', None)
    repo = kwargs.get('repo', None)
    path = kwargs.get('path', None)
    org_id = kwargs.get('org_id', None)

    assert from_user and to_user and repo and path is not None, 'Arguments error'

    detail = repo_share_perm_delete_msg_to_json(from_user, repo.id, path, org_id)
    UserNotification.objects.add_repo_share_perm_delete_msg(to_user, detail)


@receiver(share_repo_to_group_successful)
def add_share_repo_to_group_msg_cb(sender, **kwargs):
    """Notify group member when others share repos to group.
    """
    from_user = kwargs.get('from_user', None)
    group_id = kwargs.get('group_id', None)
    repo = kwargs.get('repo', None)
    path = kwargs.get('path', None)
    org_id = kwargs.get('org_id', None)

    assert from_user and group_id and repo and path is not None, 'Arguments error'

    members = ccnet_api.get_group_members(int(group_id))
    for member in members:
        to_user = member.user_name
        if to_user == from_user:
            continue
        detail = repo_share_to_group_msg_to_json(from_user, repo.id, group_id, path, org_id)
        UserNotification.objects.add_repo_share_to_group_msg(to_user, detail)

@receiver(group_join_request)
def group_join_request_cb(sender, **kwargs):
    staffs = kwargs['staffs']
    username = kwargs['username']
    group_id = kwargs['group'].id
    join_request_msg = kwargs['join_request_msg']

    detail = group_join_request_to_json(username, group_id,
                                        join_request_msg)
    for staff in staffs:
        UserNotification.objects.add_group_join_request_notice(to_user=staff,
                                                               detail=detail)

@receiver(add_user_to_group)
def add_user_to_group_cb(sender, **kwargs):
    group_staff = kwargs['group_staff']
    group_id = kwargs['group_id']
    added_user = kwargs['added_user']

    detail = add_user_to_group_to_json(group_staff,
                                       group_id)

    UserNotification.objects.set_add_user_to_group_notice(to_user=added_user,
                                                          detail=detail)


@receiver(accept_guest_invitation_successful)
def accept_guest_invitation_successful_cb(sender, **kwargs):
    inv_obj = kwargs['invitation_obj']

    detail = guest_invitation_accepted_msg_to_json(inv_obj.pk)
    UserNotification.objects.add_guest_invitation_accepted_msg(
        inv_obj.inviter, detail)

@receiver(repo_transfer)
def repo_transfer_cb(sender, **kwargs):

    org_id = kwargs['org_id']
    repo_owner = kwargs['repo_owner']
    to_user = kwargs['to_user']
    repo_id = kwargs['repo_id']
    repo_name = kwargs['repo_name']

    detail = repo_transfer_msg_to_json(org_id, repo_owner, repo_id, repo_name)
    UserNotification.objects.add_repo_transfer_msg(to_user, detail)


@receiver(saml_sso_failed)
def saml_sso_failed_cb(sender, **kwargs):
    to_user = kwargs['to_user']
    error_msg = kwargs['error_msg']

    detail = saml_sso_error_msg_to_json(error_msg)
    UserNotification.objects.add_saml_sso_error_msg(to_user, detail)
