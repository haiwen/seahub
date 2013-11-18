import datetime
from django.db import models
from django.forms import ModelForm, Textarea

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

class UserNotificationManager(models.Manager):
    def get_user_notifications(self, username):
        """Get all notifications(group_msg, grpmsg_reply, etc) of a user.
        
        Arguments:
        - `self`:
        - `username`:
        """
        return super(UserNotificationManager, self).filter(to_user=username)
        
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

    def remove_group_msg_notices(self, to_user, group_id):
        """Remove group message notices of a user.
        """
        super(UserNotificationManager, self).filter(
            to_user=to_user, msg_type=MSG_TYPE_GROUP_MSG,
            detail=str(group_id)).delete()
        
    def add_group_msg_reply_notice(self, to_user, msg_id):
        """
        
        Arguments:
        - `self`:
        - `to_user`:
        - `msg_id`:
        """
        n = super(UserNotificationManager, self).create(
            to_user=to_user, msg_type=MSG_TYPE_GRPMSG_REPLY, detail=msg_id)
        n.save()
        return n

    def get_group_msg_reply_notice(self, to_user, msg_id):
        """
        
        Arguments:
        - `self`:
        - `to_user`:
        - `msg_id`:
        """
        return super(UserNotificationManager, self).get(
            to_user=to_user, msg_type=MSG_TYPE_GRPMSG_REPLY, detail=msg_id)

class UserNotification(models.Model):
    to_user = LowerCaseCharField(db_index=True, max_length=255)
    msg_type = models.CharField(db_index=True, max_length=30)
    detail = models.TextField()
    timestamp = models.DateTimeField(default=datetime.datetime.now)
    objects = UserNotificationManager()

    def __unicode__(self):
        return '%s|%s|%s' % (self.to_user, self.msg_type, self.detail)
        
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
        
