# -*- coding: utf-8 -*-
import datetime

from django.db import models
from django.db.models import Q

from seahub.base.fields import LowerCaseCharField
from seahub.message.signals import user_message_sent

class UserMessageManager(models.Manager):
    def get_messages_related_to_user(self, username):
        """List all messages related to the user, including he/she send to
        others and others send to he/she.
        """
        return super(UserMessageManager, self).filter(
            (Q(to_email=username) & Q(recipient_deleted_at__isnull=True)) |
            (Q(from_email=username) & Q(sender_deleted_at__isnull=True))
            ).order_by('to_email')

    def get_messages_between_users(self, user1, user2):
        """List messages between two users.
        If a msg is sent from ``user1`` to ``user2``, and deleted by ``user1``,
        the msg should be hide to ``user1``, otherwise showed.
        If a msg is send from ``user2`` to ``user1``, and deleted by ``user1``,
        the msg should be hide to ``user1``, otherwise showed.
        """
        return super(UserMessageManager, self).filter(
            (Q(from_email=user1)&Q(to_email=user2)&Q(sender_deleted_at__isnull=True)) |
            (Q(from_email=user2)&Q(to_email=user1)&Q(recipient_deleted_at__isnull=True))
            ).order_by('-timestamp')

    def add_unread_message(self, user1, user2, msg):
        """Add a new message sent from ``user1`` to ``user2``.
        """
        new_msg = self.model(from_email=user1, to_email=user2, message=msg,
                             ifread=0)
        new_msg.save(using=self._db)
        user_message_sent.send(sender=None, msg=new_msg)
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
    sender_deleted_at    = models.DateTimeField(null=True, blank=True)
    recipient_deleted_at = models.DateTimeField(null=True, blank=True)
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

