# -*- coding: utf-8 -*-
import datetime
import os
import simplejson as json

from django.db import models
from django.db.models.signals import post_save
from django.forms import ModelForm, Textarea
from django.utils.http import urlquote
from django.utils.translation import ugettext as _

from seaserv import seafile_api

from seahub.base.fields import LowerCaseCharField

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
    """
    """
    return json.dumps({'share_from': share_from, 'repo_id': repo_id})

def priv_file_share_msg_to_json(share_from, file_name, priv_share_token):
    """
    """
    return json.dumps({'share_from': share_from, 'file_name': file_name,
                       'priv_share_token': priv_share_token})

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

    def count_unseen_user_notifications(self, username):
        """
        
        Arguments:
        - `self`:
        - `username`:
        """
        return super(UserNotificationManager, self).filter(
            to_user=username, seen=False).count()
        
    def bulk_add_group_msg_notices(self, to_users, group_id):
        """Efficiently add group message notices.

        NOTE: ``pre_save`` and ``post_save`` signals will not be sent.

        Arguments:
        - `self`:
        - `to_users`:
        - `msg_type`:
        - `detail`:
        """
        user_notices = [ UserNotification(to_user=m,
                                          msg_type=MSG_TYPE_GROUP_MSG,
                                          detail=group_id
                                          ) for m in to_users ]
        UserNotification.objects.bulk_create(user_notices)


    def seen_group_msg_notices(self, to_user, group_id):
        """Mark group message notices of a user as seen.
        """
        super(UserNotificationManager, self).filter(
            to_user=to_user, msg_type=MSG_TYPE_GROUP_MSG,
            detail=str(group_id)).update(seen=True)
        
    def remove_group_msg_notices(self, to_user, group_id):
        """Remove group message notices of a user.
        """
        super(UserNotificationManager, self).filter(
            to_user=to_user, msg_type=MSG_TYPE_GROUP_MSG,
            detail=str(group_id)).delete()
        
    def add_group_msg_reply_notice(self, to_user, msg_id):
        """Added group message reply notice for user.
        
        Arguments:
        - `self`:
        - `to_user`:
        - `msg_id`:
        """
        return self._add_user_notification(to_user,
                                           MSG_TYPE_GRPMSG_REPLY, msg_id)

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

    def seen_group_msg_reply_notice(self, to_user):
        """Mark all group message replies of a user as seen.
        
        Arguments:
        - `self`:
        - `to_user`:
        - `msg_id`:
        """
        super(UserNotificationManager, self).filter(
            to_user=to_user, msg_type=MSG_TYPE_GRPMSG_REPLY).update(seen=True)

    def remove_group_msg_reply_notice(self, to_user):
        """Mark all group message replies of a user as seen.
        
        Arguments:
        - `self`:
        - `to_user`:
        - `msg_id`:
        """
        super(UserNotificationManager, self).filter(
            to_user=to_user, msg_type=MSG_TYPE_GRPMSG_REPLY).delete()

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

        msg = _(u"You have recieved a <a href='%(href)s'>new message</a> from %(user)s.") % {
            'user': msg_from,
            'href': reverse('message_list'),
            }
        return msg
        
########## handle signals
from django.core.urlresolvers import reverse
from django.dispatch import receiver

from seahub.signals import share_file_to_user_successful, upload_file_successful
from seahub.share.signals import share_repo_to_user_successful
from seahub.message.models import UserMessage
    
@receiver(upload_file_successful)        
def add_upload_file_msg_cb(sender, **kwargs):
    """Notify repo owner when others upload files to his/her share folder.
    
    Arguments:
    - `sender`:
    - `**kwargs)`:
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
    from_user = kwargs.get('from_user', None)
    to_user = kwargs.get('to_user', None)
    repo = kwargs.get('repo', None)
    
    assert from_user and to_user and repo is not None, 'Arguments error'

    from seahub.base.templatetags.seahub_tags import email2nickname
    nickname = email2nickname(from_user)

    detail = repo_share_msg_to_json(nickname, repo.id)
    UserNotification.objects.add_repo_share_msg(to_user, detail)

@receiver(share_file_to_user_successful)
def add_share_file_msg_cb(sender, **kwargs):
    priv_share = kwargs.get('priv_share_obj', None)
    file_name = os.path.basename(priv_share.path)

    assert priv_share is not None, 'Argument error'

    from seahub.base.templatetags.seahub_tags import email2nickname
    nickname = email2nickname(priv_share.from_user)

    detail = priv_file_share_msg_to_json(nickname, file_name, priv_share.token)
    UserNotification.objects.add_priv_file_share_msg(priv_share.to_user, detail)
    
@receiver(post_save, sender=UserMessage)
def add_user_message_cb(sender, instance, **kwargs):
    """
    """
    msg_from = instance.from_email
    msg_to = instance.to_email

    from seahub.base.templatetags.seahub_tags import email2nickname
    nickname = email2nickname(msg_from)
    UserNotification.objects.add_user_message(msg_to, detail=nickname)
    
