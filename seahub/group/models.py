import datetime
import os
import re
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from seaserv import get_group_members

from seahub.base.fields import LowerCaseCharField
from seahub.shortcuts import get_first_object_or_none
from seahub.notifications.models import UserNotification
from seahub.profile.models import Profile

class GroupMessage(models.Model):
    group_id = models.IntegerField(db_index=True)
    from_email = LowerCaseCharField(max_length=255)
    message = models.CharField(max_length=2048)
    timestamp = models.DateTimeField(default=datetime.datetime.now)

class MessageReply(models.Model):
    reply_to = models.ForeignKey(GroupMessage)
    from_email = LowerCaseCharField(max_length=255)
    message = models.CharField(max_length=2048)
    timestamp = models.DateTimeField(default=datetime.datetime.now)

class MessageAttachment(models.Model):
    """
    Model used to represents a message attachment related to a group message.
    """
    group_message = models.ForeignKey(GroupMessage)
    repo_id = models.CharField(max_length=40)
    attach_type = models.CharField(max_length=5) # `file` or `dir`
    path = models.TextField()
    src = models.CharField(max_length=20) # `recommend` or `filecomment`

@receiver(post_save, sender=MessageReply)
def msgreply_save_handler(sender, instance, **kwargs):
    """
    Handle sending notification to '@<user>' when reply messages.
    """
    from_email = instance.from_email
    reply_msg =  instance.message
    group_msg =  instance.reply_to
    to_user = ''

    from seahub.base.templatetags.seahub_tags import at_pattern
    m = re.match(at_pattern, reply_msg)
    if m:
        nickname_or_emailprefix = m.group()[1:]
        for member in get_group_members(group_msg.group_id):
            # For every group member, get his username and nickname if
            # it exists, check whether match.
            username = member.user_name
            if username == from_email:
                continue
            
            p = get_first_object_or_none(
                Profile.objects.filter(user=username))
            nickname = p.nickname if p else ''
            if nickname == nickname_or_emailprefix or \
                    username.split('@')[0] == nickname_or_emailprefix:
                to_user = username
                break

        if to_user:
            # Send notification to the user if he replies someone else'
            # message.
            try:
                UserNotification.objects.get(to_user=to_user,
                                             msg_type='grpmsg_reply',
                                             detail=group_msg.id)
            except UserNotification.DoesNotExist:
                n = UserNotification(to_user=to_user,
                                     msg_type='grpmsg_reply',
                                     detail=group_msg.id)
                n.save()

class PublicGroup(models.Model):
    """
    To record a public group
    """
    group_id = models.IntegerField(db_index=True)
