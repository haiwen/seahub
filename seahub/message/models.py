# -*- coding: utf-8 -*-
import os
import datetime

from django import forms
from django.db import models
from django.db.models import Q
from django.forms import ModelForm
from django.utils.translation import ugettext as _
from django.utils.http import urlquote

from seahub.base.fields import LowerCaseCharField

class UserMessageManager(models.Manager):
    def get_messages_related_to_user(self, username):
        """List all messages related to the user, including he/she send to
        others and others send to he/she.
        """
        return super(UserMessageManager, self).filter(
            Q(to_email=username)|Q(from_email=username)).order_by('to_email')

    def get_messages_between_users(self, user1, user2):
        """List messages between two users.
        """
        return super(UserMessageManager, self).filter(
            (Q(from_email=user1)&Q(to_email=user2)) |
            (Q(from_email=user2)&Q(to_email=user1))).order_by('-timestamp')

    def add_unread_message(self, user1, user2, msg):
        """Add a new message sent from ``user1`` to ``user2``.
        """
        new_msg = self.model(from_email=user1, to_email=user2, message=msg,
                             ifread=0)
        new_msg.save(using=self._db)
        return new_msg
    
    def update_unread_messages(self, user1, user2):
        """Set ``ifread`` field to 1 for all messages that from ``user1``
        to ``user2``.
        """
        super(UserMessageManager, self).filter(
            Q(from_email=user1)&Q(to_email=user2)&Q(ifread=0)
            ).update(ifread=1)

    def count_unread_messages_by_user(self, user):
        """Count a user's unread messages.
        """
        return super(UserMessageManager, self).filter(to_email=user,
                                                      ifread=0).count()
        

class UserMessage(models.Model):
    message_id = models.AutoField(primary_key=True)
    message    = models.CharField(max_length=512)
    from_email = LowerCaseCharField(max_length=255, db_index=True)
    to_email   = LowerCaseCharField(max_length=255, db_index=True)
    timestamp  = models.DateTimeField(default=datetime.datetime.now)
    ifread     = models.BooleanField()
    objects = UserMessageManager()

    def __unicode__(self):
        return "%s|%s|%s" % (self.from_email, self.to_email, self.message)

class UserMsgLastCheck(models.Model):
    check_time = models.DateTimeField()

class UserMsgAttachmentManager(models.Manager):
    def add_user_msg_attachment(self, user_msg, priv_share):
        """
        """
        uma = self.model(user_msg=user_msg, priv_file_dir_share=priv_share)
        uma.save(using=self.db)
        return uma

    def list_attachments_by_user_msgs(self, user_msgs):
        """List attachements of each user message.
        """

        return super(UserMsgAttachmentManager, self).filter(user_msg__in=user_msgs)
        
        
class UserMsgAttachment(models.Model):
    user_msg = models.ForeignKey('UserMessage')
    # Set this field to NULL if file is unshared.
    priv_file_dir_share = models.ForeignKey('share.PrivateFileDirShare',
                                            blank=True, null=True,
                                            on_delete=models.SET_NULL)
    objects = UserMsgAttachmentManager()

### handle signals
from django.core.urlresolvers import reverse
from django.dispatch import receiver
from seahub.signals import share_file_to_user_successful, upload_file_successful
from seahub.share.signals import share_repo_to_user_successful

@receiver(share_repo_to_user_successful)
def add_share_repo_msg(sender, **kwargs):
    from_user = kwargs.get('from_user', '')
    to_user = kwargs.get('to_user', '')
    repo = kwargs.get('repo', None)
    
    if from_user and to_user and repo:
        from seahub.base.templatetags.seahub_tags import email2nickname
        
        msg = _(u"(System) %(user)s has shared a library named <a href='%(href)s'>%(repo_name)s</a> to you.") % \
            {'user': email2nickname(from_user),
             'href': reverse('repo', args=[repo.id]),
             'repo_name': repo.name}
        UserMessage.objects.add_unread_message(from_user, to_user, msg)

@receiver(share_file_to_user_successful)
def add_share_file_msg(sender, **kwargs):
    priv_share = kwargs.get('priv_share_obj', None)
    file_name = os.path.basename(priv_share.path)

    if priv_share is not None:
        from seahub.base.templatetags.seahub_tags import email2nickname

        msg = _(u"(System) %(user)s has shared a file named <a href='%(href)s'>%(file_name)s</a> to you.") % \
            {'user': email2nickname(priv_share.from_user),
             'href': reverse('view_priv_shared_file', args=[priv_share.token]),
             'file_name': file_name}
        UserMessage.objects.add_unread_message(priv_share.from_user,
                                               priv_share.to_user, msg)
        
@receiver(upload_file_successful)        
def add_upload_file_msg(sender, **kwargs):
    """
    
    Arguments:
    - `sender`:
    - `**kwargs)`:
    """
    repo_id = kwargs.get('repo_id', None)
    file_path = kwargs.get('file_path', None)
    owner = kwargs.get('owner', None)

    assert repo_id and file_path and owner is not None, 'Arguments error'

    # message body
    filename = os.path.basename(file_path)
    folder_path = os.path.dirname(file_path)
    folder_name = os.path.basename(folder_path)

    msg = u"(System) A file named <a href='%(file_link)s'>%(file_name)s</a> is uploaded to your folder <a href='%(folder_link)s'>%(folder)s</a>" % {
    'file_link': reverse('repo_view_file', args=[repo_id]) + '?p=' + urlquote(file_path), 
    'file_name': filename,
    'folder_link': reverse('repo', args=[repo_id]) + '?p=' + urlquote(folder_path),
    'folder': folder_name,
    }

    UserMessage.objects.add_unread_message("system@system.com", owner, msg)
