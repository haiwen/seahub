# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import datetime
import os
import json
import logging

from django.db import models
from django.forms import ModelForm, Textarea
from django.utils.html import escape
from django.utils.translation import ugettext as _
from django.core.cache import cache

import seaserv
from seaserv import seafile_api, ccnet_api

from seahub.base.fields import LowerCaseCharField
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.repo import get_repo_shared_users
from seahub.utils import normalize_cache_key

# Get an instance of a logger
logger = logging.getLogger(__name__)


########## system notification
class Notification(models.Model):
    message = models.CharField(max_length=512)
    primary = models.BooleanField(default=False)

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

########## user notification
MSG_TYPE_GROUP_MSG = 'group_msg'
MSG_TYPE_GROUP_JOIN_REQUEST = 'group_join_request'
MSG_TYPE_ADD_USER_TO_GROUP = 'add_user_to_group'
MSG_TYPE_FILE_UPLOADED = 'file_uploaded'
MSG_TYPE_REPO_SHARE = 'repo_share'
MSG_TYPE_REPO_SHARE_TO_GROUP = 'repo_share_to_group'
MSG_TYPE_USER_MESSAGE = 'user_message'
MSG_TYPE_FILE_COMMENT = 'file_comment'

USER_NOTIFICATION_COUNT_CACHE_PREFIX = 'USER_NOTIFICATION_COUNT_'

def file_uploaded_msg_to_json(file_name, repo_id, uploaded_to):
    """Encode file uploaded message to json string.
    """
    return json.dumps({'file_name': file_name, 'repo_id': repo_id,
                       'uploaded_to': uploaded_to})

def repo_share_msg_to_json(share_from, repo_id):
    return json.dumps({'share_from': share_from, 'repo_id': repo_id})

def repo_share_to_group_msg_to_json(share_from, repo_id, group_id):
    return json.dumps({'share_from': share_from, 'repo_id': repo_id, 'group_id': group_id})

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

def get_cache_key_of_unseen_notifications(username):
    return normalize_cache_key(username,
            USER_NOTIFICATION_COUNT_CACHE_PREFIX)


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

        cache_key = get_cache_key_of_unseen_notifications(to_user)
        cache.delete(cache_key)

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

    def bulk_add_group_msg_notices(self, to_users, detail):
        """Efficiently add group message notices.

        NOTE: ``pre_save`` and ``post_save`` signals will not be sent.

        Arguments:
        - `self`:
        - `to_users`:
        - `detail`:
        """
        user_notices = [ UserNotification(to_user=m,
                                          msg_type=MSG_TYPE_GROUP_MSG,
                                          detail=detail
                                          ) for m in to_users ]
        UserNotification.objects.bulk_create(user_notices)

    def seen_group_msg_notices(self, to_user, group_id):
        """Mark group message notices of a user as seen.
        """
        user_notices = super(UserNotificationManager, self).filter(
            to_user=to_user, msg_type=MSG_TYPE_GROUP_MSG)
        for notice in user_notices:
            try:
                gid = notice.group_message_detail_to_dict().get('group_id')
                if gid == group_id:
                    if notice.seen is False:
                        notice.seen = True
                        notice.save()
            except UserNotification.InvalidDetailError:
                continue

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

    def remove_group_msg_notices(self, to_user, group_id):
        """Remove group message notices of a user.
        """
        super(UserNotificationManager, self).filter(
            to_user=to_user, msg_type=MSG_TYPE_GROUP_MSG,
            detail=str(group_id)).delete()

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

    def add_repo_share_msg(self, to_user, detail):
        """Notify ``to_user`` that others shared a repo to him/her.

        Arguments:
        - `self`:
        - `to_user`:
        - `repo_id`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_REPO_SHARE, detail)

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

class UserNotification(models.Model):
    to_user = LowerCaseCharField(db_index=True, max_length=255)
    msg_type = models.CharField(db_index=True, max_length=30)
    detail = models.TextField()
    timestamp = models.DateTimeField(default=datetime.datetime.now)
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

    def is_group_msg(self):
        """Check whether is a group message notification.

        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_GROUP_MSG

    def is_file_uploaded_msg(self):
        """

        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_FILE_UPLOADED

    def is_repo_share_msg(self):
        """

        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_REPO_SHARE

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

    def group_message_detail_to_dict(self):
        """Parse group message detail, returns dict contains ``group_id`` and
        ``msg_from``.

        NOTE: ``msg_from`` may be ``None``.

        Arguments:
        - `self`:

        Raises ``InvalidDetailError`` if detail field can not be parsed.
        """
        assert self.is_group_msg()

        try:
            detail = json.loads(self.detail)
        except ValueError:
            raise self.InvalidDetailError, 'Wrong detail format of group message'
        else:
            if isinstance(detail, int): # Compatible with existing records
                group_id = detail
                msg_from = None
                return {'group_id': group_id, 'msg_from': msg_from}
            elif isinstance(detail, dict):
                group_id = detail['group_id']
                msg_from = detail['msg_from']
                if 'message' in detail:
                    message = detail['message']
                    return {'group_id': group_id, 'msg_from': msg_from, 'message': message}
                else:
                    return {'group_id': group_id, 'msg_from': msg_from}
            else:
                raise self.InvalidDetailError, 'Wrong detail format of group message'

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
    def format_file_uploaded_msg(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _(u"Internal error")

        filename = d['file_name']
        repo_id = d['repo_id']
        repo = seafile_api.get_repo(repo_id)
        if repo:
            if d['uploaded_to'] == '/':
                # current upload path is '/'
                file_path = '/' + filename
                link = reverse('view_common_lib_dir', args=[repo_id, ''])
                name = repo.name
            else:
                uploaded_to = d['uploaded_to'].rstrip('/')
                file_path = uploaded_to + '/' + filename
                link = reverse('view_common_lib_dir', args=[repo_id, uploaded_to.lstrip('/')])
                name = os.path.basename(uploaded_to)

            file_link = reverse('view_lib_file', args=[repo_id, file_path])

            msg = _(u"A file named <a href='%(file_link)s'>%(file_name)s</a> is uploaded to <a href='%(link)s'>%(name)s</a>") % {
                'file_link': file_link,
                'file_name': escape(filename),
                'link': link,
                'name': escape(name),
                }
        else:
            msg = _(u"A file named <strong>%(file_name)s</strong> is uploaded to <strong>Deleted Library</strong>") % {
                'file_name': escape(filename),
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
            return _(u"Internal error")

        share_from = email2nickname(d['share_from'])
        repo_id = d['repo_id']

        repo = seafile_api.get_repo(repo_id)
        if repo is None:
            self.delete()
            return None

        msg = _(u"%(user)s has shared a library named <a href='%(href)s'>%(repo_name)s</a> to you.") %  {
            'user': escape(share_from),
            'href': reverse('view_common_lib_dir', args=[repo.id, '']),
            'repo_name': escape(repo.name),
            }

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
            return _(u"Internal error")

        share_from = email2nickname(d['share_from'])
        repo_id = d['repo_id']
        group_id = d['group_id']

        try:
            repo = seafile_api.get_repo(repo_id)
            group = ccnet_api.get_group(group_id)
        except Exception as e:
            logger.error(e)
            return None

        if not repo or not group:
            self.delete()
            return None

        msg = _(u"%(user)s has shared a library named <a href='%(repo_href)s'>%(repo_name)s</a> to group <a href='%(group_href)s'>%(group_name)s</a>.") %  {
            'user': escape(share_from),
            'repo_href': reverse('view_common_lib_dir', args=[repo.id, '']),
            'repo_name': escape(repo.name),
            'group_href': reverse('group_info', args=[group.id]),
            'group_name': escape(group.group_name),
            }

        return msg

    def format_group_message_title(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = self.group_message_detail_to_dict()
        except self.InvalidDetailError as e:
            logger.error(e)
            return _(u"Internal error")

        group_id = d.get('group_id')
        group = ccnet_api.get_group(group_id)
        if group is None:
            self.delete()
            return None

        msg_from = d.get('msg_from')

        if msg_from is None:
            msg = _(u"<a href='%(href)s'>%(group_name)s</a> has a new discussion.") % {
                'href': reverse('group_discuss', args=[group.id]),
                'group_name': group.group_name}
        else:
            msg = _(u"%(user)s posted a new discussion in <a href='%(href)s'>%(group_name)s</a>.") % {
                'href': reverse('group_discuss', args=[group.id]),
                'user': escape(email2nickname(msg_from)),
                'group_name': escape(group.group_name)
            }
        return msg

    def format_group_message_detail(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = self.group_message_detail_to_dict()
        except self.InvalidDetailError as e:
            logger.error(e)
            return _(u"Internal error")

        message = d.get('message')
        if message is not None:
            return message
        else:
            return None

    def format_group_join_request(self):
        """

        Arguments:
        - `self`:
        """
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _(u"Internal error")

        username = d['username']
        group_id = d['group_id']
        join_request_msg = d['join_request_msg']

        group = ccnet_api.get_group(group_id)
        if group is None:
            self.delete()
            return None

        msg = _(u"User <a href='%(user_profile)s'>%(username)s</a> has asked to join group <a href='%(href)s'>%(group_name)s</a>, verification message: %(join_request_msg)s") % {
            'user_profile': reverse('user_profile', args=[username]),
            'username': username,
            'href': reverse('group_members', args=[group_id]),
            'group_name': escape(group.group_name),
            'join_request_msg': escape(join_request_msg),
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
            return _(u"Internal error")

        group_staff = d['group_staff']
        group_id = d['group_id']

        group = ccnet_api.get_group(group_id)
        if group is None:
            self.delete()
            return None

        msg = _(u"User <a href='%(user_profile)s'>%(group_staff)s</a> has added you to group <a href='%(href)s'>%(group_name)s</a>") % {
            'user_profile': reverse('user_profile', args=[group_staff]),
            'group_staff': group_staff,
            'href': reverse('group_info', args=[group_id]),
            'group_name': escape(group.group_name)}
        return msg

    def format_file_comment_msg(self):
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _(u"Internal error")

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

########## handle signals
from django.core.urlresolvers import reverse
from django.dispatch import receiver

from seahub.signals import upload_file_successful, comment_file_successful
from seahub.group.signals import grpmsg_added, group_join_request, add_user_to_group
from seahub.share.signals import share_repo_to_user_successful, \
    share_repo_to_group_successful

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

@receiver(share_repo_to_user_successful)
def add_share_repo_msg_cb(sender, **kwargs):
    """Notify user when others share repos to him/her.
    """
    from_user = kwargs.get('from_user', None)
    to_user = kwargs.get('to_user', None)
    repo = kwargs.get('repo', None)

    assert from_user and to_user and repo is not None, 'Arguments error'

    detail = repo_share_msg_to_json(from_user, repo.id)
    UserNotification.objects.add_repo_share_msg(to_user, detail)

@receiver(share_repo_to_group_successful)
def add_share_repo_to_group_msg_cb(sender, **kwargs):
    """Notify group member when others share repos to group.
    """
    from_user = kwargs.get('from_user', None)
    group_id = kwargs.get('group_id', None)
    repo = kwargs.get('repo', None)

    assert from_user and group_id and repo is not None, 'Arguments error'

    members = ccnet_api.get_group_members(int(group_id))
    for member in members:
        to_user = member.user_name
        if to_user == from_user:
            continue
        detail = repo_share_to_group_msg_to_json(from_user, repo.id, group_id)
        UserNotification.objects.add_repo_share_to_group_msg(to_user, detail)

@receiver(grpmsg_added)
def grpmsg_added_cb(sender, **kwargs):
    group_id = kwargs['group_id']
    from_email = kwargs['from_email']
    message = kwargs['message']
    group_members = seaserv.get_group_members(int(group_id))

    notify_members = [x.user_name for x in group_members if x.user_name != from_email]

    detail = group_msg_to_json(group_id, from_email, message)
    UserNotification.objects.bulk_add_group_msg_notices(notify_members, detail)

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

@receiver(comment_file_successful)
def comment_file_successful_cb(sender, **kwargs):
    repo = kwargs['repo']
    repo_owner = kwargs['repo_owner']
    file_path = kwargs['file_path']
    comment = kwargs['comment']
    author = kwargs['author']

    notify_users = get_repo_shared_users(repo.id, repo_owner)
    notify_users.append(repo_owner)
    notify_users = [x for x in notify_users if x != author]
    for u in notify_users:
        detail = file_comment_msg_to_json(repo.id, file_path, author, comment)
        UserNotification.objects.add_file_comment_msg(u, detail)
