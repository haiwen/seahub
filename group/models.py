import datetime
import os
import re
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from seaserv import get_group_members

from shortcuts import get_first_object_or_none
from notifications.models import UserNotification
from profile.models import Profile

class GroupMessage(models.Model):
    group_id = models.IntegerField(db_index=True)
    from_email = models.EmailField()
    message = models.CharField(max_length=500)
    timestamp = models.DateTimeField(default=datetime.datetime.now)

class MessageReply(models.Model):
    reply_to = models.ForeignKey(GroupMessage)
    from_email = models.EmailField()
    message = models.CharField(max_length=150)
    timestamp = models.DateTimeField(default=datetime.datetime.now)

@receiver(post_save, sender=MessageReply)
def msgreply_save_handler(sender, instance, **kwargs):
    """
    Handl sending notification to '@<user>' when reply messages.
    """
    from_email = instance.from_email
    reply_msg =  instance.message
    group_msg =  instance.reply_to
    to_user = ''
    
    at_pattern = re.compile(r'(\s|^)(@\w+)', flags=re.U)
    m = re.match(at_pattern, reply_msg)
    if m:
        nickname_or_emailprefix = m.group()[1:]
        for member in get_group_members(group_msg.group_id):
            # For every group member, get his username and nickname if
            # it exists, check whether match.
            username = member.user_name
            if username == from_email:
                continue
            
            p = get_first_object_or_none(\
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
                
