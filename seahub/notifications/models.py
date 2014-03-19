# -*- coding: utf-8 -*-
import datetime
import os
import simplejson as json

from django.db import models
from django.db.models.signals import post_save
from django.forms import ModelForm, Textarea
from django.utils.http import urlquote
from django.utils.translation import ugettext as _

import seaserv
from seaserv import seafile_api

from seahub.base.fields import LowerCaseCharField
from seahub.base.templatetags.seahub_tags import email2nickname


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
MSG_TYPE_GRPMSG_REPLY = 'grpmsg_reply'
MSG_TYPE_FILE_UPLOADED = 'file_uploaded'
MSG_TYPE_REPO_SHARE = 'repo_share'
MSG_TYPE_PRIV_FILE_SHARE = 'priv_file_share'
MSG_TYPE_USER_MESSAGE = 'user_message'

def file_uploaded_msg_to_json(file_name, repo_id, uploaded_to):
    """Encode file uploaded message to json string.
    """
    return json.dumps({'file_name': file_name, 'repo_id': repo_id,
                       'uploaded_to': uploaded_to})

def repo_share_msg_to_json(share_from, repo_id):
    return json.dumps({'share_from': share_from, 'repo_id': repo_id})

def priv_file_share_msg_to_json(share_from, file_name, priv_share_token):
    return json.dumps({'share_from': share_from, 'file_name': file_name,
                       'priv_share_token': priv_share_token})

def group_msg_to_json(group_id, msg_from):
    return json.dumps({'group_id': group_id, 'msg_from': msg_from})

def grpmsg_reply_to_json(msg_id, reply_from):
    return json.dumps({'msg_id': msg_id, 'reply_from': reply_from})

def group_join_request_to_json(username, group_id, join_request_msg):
    return json.dumps({'username': username, 'group_id': group_id,
                       'join_request_msg': join_request_msg})
    
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
        """Mark group message notices of a user as seen.
        """
        user_notices = super(UserNotificationManager, self).filter(
            detail=from_user, to_user=to_user, msg_type=MSG_TYPE_USER_MESSAGE)
        for notice in user_notices:
            notice.is_seen()

    def remove_group_msg_notices(self, to_user, group_id):
        """Remove group message notices of a user.
        """
        super(UserNotificationManager, self).filter(
            to_user=to_user, msg_type=MSG_TYPE_GROUP_MSG,
            detail=str(group_id)).delete()
        
    def add_group_msg_reply_notice(self, to_user, detail):
        """Added group message reply notice for user.
        
        Arguments:
        - `self`:
        - `to_user`:
        - `msg_id`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_GRPMSG_REPLY, detail)

    def get_group_msg_reply_notices(self, to_user, seen=None):
        """Get all group message replies of a user.
        
        Arguments:
        - `self`:
        - `to_user`:
        - `msg_id`:
        """
        qs = super(UserNotificationManager, self).filter(
            to_user=to_user, msg_type=MSG_TYPE_GRPMSG_REPLY)
        if seen is not None:
            qs = qs.filter(seen=seen)
        return qs

    def seen_group_msg_reply_notice(self, to_user, msg_id=None):
        """Mark all group message replies of a user as seen.
        
        Arguments:
        - `self`:
        - `to_user`:
        - `msg_id`:
        """
        if not msg_id:
            super(UserNotificationManager, self).filter(
                to_user=to_user, msg_type=MSG_TYPE_GRPMSG_REPLY,
                seen=False).update(seen=True)
        else:
            notifs = super(UserNotificationManager, self).filter(
                to_user=to_user, msg_type=MSG_TYPE_GRPMSG_REPLY,
                seen=False)
            for n in notifs:
                d = n.grpmsg_reply_detail_to_dict()
                if msg_id == d['msg_id']:
                    n.seen = True
                    n.save()

    def remove_group_msg_reply_notice(self, to_user):
        """Mark all group message replies of a user as seen.
        
        Arguments:
        - `self`:
        - `to_user`:
        - `msg_id`:
        """
        super(UserNotificationManager, self).filter(
            to_user=to_user, msg_type=MSG_TYPE_GRPMSG_REPLY).delete()

    def add_group_join_request_notice(self, to_user, detail):
        """
        
        Arguments:
        - `self`:
        - `to_user`:
        - `detail`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_GROUP_JOIN_REQUEST, detail)
        
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

    def add_priv_file_share_msg(self, to_user, detail):
        """Notify ``to_user`` that others shared a file to him/her.
        
        Arguments:
        - `self`:
        - `to_user`:
        - `detail`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_PRIV_FILE_SHARE, detail)

    def add_user_message(self, to_user, detail):
        """Notify ``to_user`` that others sent a message to him/her.
        
        Arguments:
        - `self`:
        - `to_user`:
        - `detail`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_USER_MESSAGE, detail)
        
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

    def is_grpmsg_reply(self):
        """Check whether is a group message reply notification.
        
        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_GRPMSG_REPLY
        
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

    def is_priv_file_share_msg(self):
        """
        
        Arguments:
        - `self`:
        """
        return self.msg_type == MSG_TYPE_PRIV_FILE_SHARE

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
        except json.JSONDecodeError:
            raise self.InvalidDetailError, 'Wrong detail format of group message'
        else:
            if isinstance(detail, int): # Compatible with existing records
                group_id = detail
                msg_from = None
            elif isinstance(detail, dict):
                group_id = detail['group_id']
                msg_from = detail['msg_from']
            else:
                raise self.InvalidDetailError, 'Wrong detail format of group message'
            return {'group_id': group_id, 'msg_from': msg_from}

    def grpmsg_reply_detail_to_dict(self):
        """Parse group message reply detail, returns dict contains
        ``msg_id`` and ``reply_from``.

        NOTE: ``reply_from`` may be ``None``.
        
        Arguments:
        - `self`:

        Raises ``InvalidDetailError`` if detail field can not be parsed.
        """
        assert self.is_grpmsg_reply()

        try:
            detail = json.loads(self.detail)
        except json.JSONDecodeError:
            raise self.InvalidDetailError, 'Wrong detail format of group message reply'
        else:
            if isinstance(detail, int): # Compatible with existing records
                msg_id = detail
                reply_from = None
            elif isinstance(detail, dict):
                msg_id = detail['msg_id']
                reply_from = detail['reply_from']
            else:
                raise self.InvalidDetailError, 'Wrong detail format of group message reply'
            return {'msg_id': msg_id, 'reply_from': reply_from}
            
    ########## functions used in templates
    def format_file_uploaded_msg(self):
        """
        
        Arguments:
        - `self`:
        """
        d = json.loads(self.detail)
        filename = d['file_name']
        repo_id = d['repo_id']
        uploaded_to = d['uploaded_to'].rstrip('/')

        file_path = uploaded_to + '/' + filename
        file_link = reverse('repo_view_file', args=[repo_id]) + '?p=' + urlquote(file_path)

        folder_link = reverse('repo', args=[repo_id]) + '?p=' + urlquote(uploaded_to)
        folder_name = os.path.basename(uploaded_to)

        msg = _(u"A file named <a href='%(file_link)s'>%(file_name)s</a> is uploaded to your folder <a href='%(folder_link)s'>%(folder)s</a>") % {
            'file_link': file_link,
            'file_name': filename,
            'folder_link': folder_link,
            'folder': folder_name,
            }
        return msg

    def format_repo_share_msg(self):
        """
        
        Arguments:
        - `self`:
        """
        d = json.loads(self.detail)
        share_from = d['share_from']
        repo_id = d['repo_id']

        repo = seafile_api.get_repo(repo_id)
        if repo is None:
            self.delete()
            return None

        msg = _(u"%(user)s has shared a library named <a href='%(href)s'>%(repo_name)s</a> to you.") %  {
            'user': share_from,
            'href': reverse('repo', args=[repo.id]),
            'repo_name': repo.name
            }
        return msg
        
    def format_priv_file_share_msg(self):
        """
        
        Arguments:
        - `self`:
        """
        d = json.loads(self.detail)
        share_from = d['share_from']
        file_name = d['file_name']
        priv_share_token = d['priv_share_token']

        msg = _(u"%(user)s has shared a file named <a href='%(href)s'>%(file_name)s</a> to you.") % {
            'user': share_from,
            'href': reverse('view_priv_shared_file', args=[priv_share_token]),
            'file_name': file_name
            }
        return msg

    def format_user_message(self):
        """
        
        Arguments:
        - `self`:
        """
        msg_from = self.detail
        nickname = email2nickname(msg_from)

        msg = _(u"You have received a <a href='%(href)s'>new message</a> from %(user)s.") % {
            'user': nickname,
            'href': reverse('user_msg_list', args=[msg_from]),
            }
        return msg

    def format_group_message(self):
        """
        
        Arguments:
        - `self`:
        """
        try:
            d = self.group_message_detail_to_dict()
        except self.InvalidDetailError as e:
            return _(u"Internal error")

        group_id = d.get('group_id')
        group = seaserv.get_group(group_id)
        if group is None:
            self.delete()
            return None

        msg_from = d.get('msg_from')

        if msg_from is None:
            msg = _(u"<a href='%(href)s'>%(group_name)s</a> has new discussion") % {
                'href': reverse('group_discuss', args=[group.id]),
                'group_name': group.group_name}
        else:
            msg = _(u"%(user)s posted a new discussion in <a href='%(href)s'>%(group_name)s</a>") % {
                'href': reverse('group_discuss', args=[group.id]),
                'user': msg_from,
                'group_name': group.group_name}

        return msg

    def format_grpmsg_reply(self):
        """
        
        Arguments:
        - `self`:
        """
        try:
            d = self.grpmsg_reply_detail_to_dict()
        except self.InvalidDetailError as e:
            return _(u"Internal error")

        msg_id = d.get('msg_id')
        reply_from = d.get('reply_from')

        if reply_from is None:
            msg = _(u"One <a href='%(href)s'>group discussion</a> has new reply") % {
                'href': reverse('msg_reply_new'),
                }
        else:
            msg = _(u"%(user)s replied your <a href='%(href)s'>group discussion</a>") % {
                'user': reply_from,
                'href': reverse('msg_reply_new')
                }
        return msg

    def format_group_join_request(self):
        """
        
        Arguments:
        - `self`:
        """
        d = json.loads(self.detail)
        username = d['username']
        group_id = d['group_id']
        join_request_msg = d['join_request_msg']

        group = seaserv.get_group(group_id)
        if group is None:
            self.delete()
            return None

        nickname = email2nickname(username)
        msg = _(u"User <a href='%(user_profile)s'>%(username)s</a> has asked to join group <a href='%(href)s'>%(group_name)s</a>, verification message: %(join_request_msg)s") % {
            'user_profile': reverse('user_profile', args=[username]),
            'username': username,
            'href': reverse('group_members', args=[group_id]),
            'group_name': group.group_name,
            'join_request_msg': join_request_msg,
            }
        return msg

########## handle signals
from django.core.urlresolvers import reverse
from django.dispatch import receiver

from seahub.signals import share_file_to_user_successful, upload_file_successful
from seahub.group.models import GroupMessage, MessageReply
from seahub.group.signals import grpmsg_added, grpmsg_reply_added, \
    group_join_request
    
from seahub.share.signals import share_repo_to_user_successful
from seahub.message.models import UserMessage
    
@receiver(upload_file_successful)        
def add_upload_file_msg_cb(sender, **kwargs):
    """Notify repo owner when others upload files to his/her share folder.
    """
    repo_id = kwargs.get('repo_id', None)
    file_path = kwargs.get('file_path', None)
    owner = kwargs.get('owner', None)

    assert repo_id and file_path and owner is not None, 'Arguments error'

    filename = os.path.basename(file_path)
    folder_path = os.path.dirname(file_path)
    folder_name = os.path.basename(folder_path)

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

    nickname = email2nickname(from_user)

    detail = repo_share_msg_to_json(nickname, repo.id)
    UserNotification.objects.add_repo_share_msg(to_user, detail)

@receiver(share_file_to_user_successful)
def add_share_file_msg_cb(sender, **kwargs):
    """Notify user when others share files to him/her.
    """
    priv_share = kwargs.get('priv_share_obj', None)
    file_name = os.path.basename(priv_share.path)

    assert priv_share is not None, 'Argument error'

    nickname = email2nickname(priv_share.from_user)

    detail = priv_file_share_msg_to_json(nickname, file_name, priv_share.token)
    UserNotification.objects.add_priv_file_share_msg(priv_share.to_user, detail)
    
@receiver(post_save, sender=UserMessage)
def add_user_message_cb(sender, instance, **kwargs):
    """Notify user when he/she got a new mesaage.
    """
    msg_from = instance.from_email
    msg_to = instance.to_email

    UserNotification.objects.add_user_message(msg_to, detail=msg_from)

@receiver(grpmsg_added)
def grpmsg_added_cb(sender, **kwargs):
    group_id = kwargs['group_id']
    from_email = kwargs['from_email']
    group_members = seaserv.get_group_members(int(group_id))

    notify_members = [ x.user_name for x in group_members if x.user_name != from_email ]

    detail = group_msg_to_json(group_id, email2nickname(from_email))
    UserNotification.objects.bulk_add_group_msg_notices(notify_members, detail)

@receiver(grpmsg_reply_added)    
def grpmsg_reply_added_cb(sender, **kwargs):
    msg_id = kwargs['msg_id']
    reply_from_email = kwargs['from_email']
    try:
        group_msg = GroupMessage.objects.get(id=msg_id)
    except GroupMessage.DoesNotExist:
        group_msg = None

    if group_msg is None:
        return

    msg_replies = MessageReply.objects.filter(reply_to=group_msg)
    notice_users = set([ x.from_email for x in msg_replies \
                             if x.from_email != reply_from_email])
    notice_users.add(group_msg.from_email)

    detail = grpmsg_reply_to_json(msg_id, email2nickname(reply_from_email))

    for user in notice_users:
        UserNotification.objects.add_group_msg_reply_notice(to_user=user,
                                                            detail=detail)

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


