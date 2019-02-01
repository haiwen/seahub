# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import datetime
import os
import json
import logging

from django.core.urlresolvers import reverse
from django.db import models
from django.conf import settings
from django.forms import ModelForm, Textarea
from django.utils.html import escape
from django.utils.translation import ugettext as _
from django.core.cache import cache
from django.template.loader import render_to_string

import seaserv
from seaserv import seafile_api, ccnet_api

from seahub.base.fields import LowerCaseCharField
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.invitations.models import Invitation
from seahub.utils.repo import get_repo_shared_users
from seahub.utils import normalize_cache_key
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.constants import HASH_URLS

# Get an instance of a logger
logger = logging.getLogger(__name__)


########## system notification
class Notification(models.Model):
    message = models.CharField(max_length=512)
    primary = models.BooleanField(default=False, db_index=True)

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
MSG_TYPE_REVIEW_COMMENT = 'review_comment'
MSG_TYPE_UPDATE_REVIEW = 'update_review'
MSG_TYPE_REQUEST_REVIEWER = 'request_reviewer'
MSG_TYPE_GUEST_INVITATION_ACCEPTED = 'guest_invitation_accepted'
MSG_TYPE_REPO_TRANSFER = 'repo_transfer'

USER_NOTIFICATION_COUNT_CACHE_PREFIX = 'USER_NOTIFICATION_COUNT_'

def file_uploaded_msg_to_json(file_name, repo_id, uploaded_to):
    """Encode file uploaded message to json string.
    """
    return json.dumps({'file_name': file_name, 'repo_id': repo_id,
                       'uploaded_to': uploaded_to})

def repo_share_msg_to_json(share_from, repo_id, path, org_id):
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

def review_comment_msg_to_json(review_id, author, comment):
    return json.dumps({'review_id': review_id,
                       'author': author,
                       'comment': comment})

def request_reviewer_msg_to_json(review_id, from_user, to_user):
    return json.dumps({'review_id': review_id,
                       'from_user': from_user,
                       'to_user': to_user})

def update_review_msg_to_json(review_id, from_user, to_user, status):
    return json.dumps({'review_id': review_id,
                       'from_user': from_user,
                       'to_user': to_user,
                       'status': status})

def guest_invitation_accepted_msg_to_json(invitation_id):
    return json.dumps({'invitation_id': invitation_id})

def repo_transfer_msg_to_json(org_id, repo_owner, repo_id, repo_name):
    """Encode repo transfer message to json string.
    """
    return json.dumps({'org_id': org_id, 'repo_owner': repo_owner,
        'repo_id': repo_id, 'repo_name': repo_name})

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

    def add_review_comment_msg(self, to_user, detail):
        """Notify ``to_user`` that review creator 
        """
        return self._add_user_notification(to_user, MSG_TYPE_REVIEW_COMMENT, detail)

    def add_request_reviewer_msg(self, to_user, detail):
        """Notify ``to_user`` that reviewer 
        """
        return self._add_user_notification(to_user, MSG_TYPE_REQUEST_REVIEWER, detail)

    def add_update_review_msg(self, to_user, detail):
        """Notify ``to_user`` that reviewer and owner 
        """
        return self._add_user_notification(to_user, MSG_TYPE_UPDATE_REVIEW, detail)

    def add_guest_invitation_accepted_msg(self, to_user, detail):
        """Nofity ``to_user`` that a guest has accpeted an invitation.
        """
        return self._add_user_notification(
            to_user, MSG_TYPE_GUEST_INVITATION_ACCEPTED, detail)

    def add_repo_transfer_msg(self, to_user, detail):
        """Nofity ``to_user`` that a library has been transfered to him/her.
        """
        return self._add_user_notification(
            to_user, MSG_TYPE_REPO_TRANSFER, detail)


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

    def is_review_comment_msg(self):
        return self.msg_type == MSG_TYPE_REVIEW_COMMENT

    def is_request_reviewer_msg(self):
        return self.msg_type == MSG_TYPE_REQUEST_REVIEWER

    def is_update_review_msg(self):
        return self.msg_type == MSG_TYPE_UPDATE_REVIEW

    def is_guest_invitation_accepted_msg(self):
        return self.msg_type == MSG_TYPE_GUEST_INVITATION_ACCEPTED

    def is_repo_transfer_msg(self):
        return self.msg_type == MSG_TYPE_REPO_TRANSFER

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
    def format_msg(self):
        if self.is_group_msg():
            return self.format_group_message_title()
        elif self.is_file_uploaded_msg():
            return self.format_file_uploaded_msg()
        elif self.is_repo_share_msg():
            return self.format_repo_share_msg()
        elif self.is_repo_share_to_group_msg():
            return self.format_repo_share_to_group_msg()
        elif self.is_group_join_request():
            return self.format_group_join_request()
        elif self.is_file_comment_msg():
            return self.format_file_comment_msg()
        elif self.is_review_comment_msg():
            return self.format_review_comment_msg()
        elif self.is_update_review_msg():
            return self.format_update_review_msg()
        elif self.is_request_reviewer_msg():
            return self.format_request_reviewer_msg()
        elif self.is_guest_invitation_accepted_msg():
            return self.format_guest_invitation_accepted_msg()
        elif self.is_add_user_to_group():
            return self.format_add_user_to_group()
        elif self.is_repo_transfer_msg():
            return self.format_repo_transfer_msg()
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
            return _(u"Internal error")

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
            return _(u"Internal error")

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
                'href': HASH_URLS['GROUP_DISCUSS'] % {'group_id': group.id},
                'group_name': group.group_name}
        else:
            msg = _(u"%(user)s posted a new discussion in <a href='%(href)s'>%(group_name)s</a>.") % {
                'href': HASH_URLS['GROUP_DISCUSS'] % {'group_id': group.id},
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
            'href': HASH_URLS['GROUP_MEMBERS'] % {'group_id': group_id},
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
            'group_staff': escape(email2nickname(group_staff)),
            'href': reverse('group', args=[group_id]),
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

    def format_review_comment_msg(self):
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _(u"Internal error")

        review_id = d['review_id']
        author = d['author']

        msg = _("<a href='%(file_url)s'>Review #%(review_id)s</a> has a new comment from user %(author)s") % {
            'review_id': review_id,
            'file_url': reverse('drafts:review', args=[review_id]),
            'author': escape(email2nickname(author)),
        }
        return msg

    def format_request_reviewer_msg(self):
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _(u"Internal error")

        review_id = d['review_id']
        from_user = d['from_user']

        msg = _("%(from_user)s has sent you a request for <a href='%(file_url)s'>review #%(review_id)s</a>") % {
            'review_id': review_id,
            'file_url': reverse('drafts:review', args=[review_id]),
            'from_user': escape(email2nickname(from_user))
        }
        return msg

    def format_update_review_msg(self):
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _(u"Internal error")

        review_id = d['review_id']
        from_user = d['from_user']
        status = d['status']

        if status == 'closed':
            msg = _("%(from_user)s has closed <a href='%(file_url)s'>review #%(review_id)s</a>") % {
                'review_id': review_id,
                'file_url': reverse('drafts:review', args=[review_id]),
                'from_user': escape(email2nickname(from_user))
            }

        if status == 'finished':
            msg = _("%(from_user)s has published <a href='%(file_url)s'>review #%(review_id)s</a>") % {
                'review_id': review_id,
                'file_url': reverse('drafts:review', args=[review_id]),
                'from_user': escape(email2nickname(from_user))
            }
        return msg

    def format_guest_invitation_accepted_msg(self):
        try:
            d = json.loads(self.detail)
        except Exception as e:
            logger.error(e)
            return _(u"Internal error")

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
            return _(u"Internal error")

        repo_owner_name = email2nickname(d['repo_owner'])
        repo_id = d['repo_id']
        repo_name = d['repo_name']
        repo_url = reverse('lib_view', args=[repo_id, repo_name, ''])
        msg = _('%(user)s has transfered a library named <a href="%(repo_url)s">%(repo_name)s</a> to you.') % {
            'user': repo_owner_name,
            'repo_url': repo_url,
            'repo_name': repo_name,
        }
        return msg


########## handle signals
from django.dispatch import receiver

from seahub.signals import upload_file_successful, comment_file_successful, repo_transfer
from seahub.group.signals import grpmsg_added, group_join_request, add_user_to_group
from seahub.share.signals import share_repo_to_user_successful, \
    share_repo_to_group_successful
from seahub.invitations.signals import accept_guest_invitation_successful
from seahub.drafts.signals import comment_review_successful, \
        request_reviewer_successful, update_review_successful

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
    path = kwargs.get('path', None)
    org_id = kwargs.get('org_id', None)

    assert from_user and to_user and repo and path is not None, 'Arguments error'

    detail = repo_share_msg_to_json(from_user, repo.id, path, org_id)
    UserNotification.objects.add_repo_share_msg(to_user, detail)

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

@receiver(comment_review_successful)
def comment_review_successful_cb(sender, **kwargs):
    review = kwargs['review']
    comment = kwargs['comment']
    author = kwargs['author']

    detail = review_comment_msg_to_json(review.id, author, comment)
    UserNotification.objects.add_review_comment_msg(review.creator, detail)

@receiver(request_reviewer_successful)
def requeset_reviewer_successful_cb(sender, **kwargs):
    from_user = kwargs['from_user']
    review_id = kwargs['review_id']
    to_user = kwargs['to_user']

    detail = request_reviewer_msg_to_json(review_id, from_user, to_user)

    UserNotification.objects.add_request_reviewer_msg(to_user, detail)

@receiver(update_review_successful)
def update_review_successful_cb(sender, **kwargs):
    from_user = kwargs['from_user']
    review_id = kwargs['review_id']
    to_user = kwargs['to_user']
    status = kwargs['status']

    detail = update_review_msg_to_json(review_id, from_user, to_user, status)

    UserNotification.objects.add_update_review_msg(to_user, detail)

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
