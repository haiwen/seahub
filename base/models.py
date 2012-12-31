import datetime
import re
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from seaserv import get_emailusers

from shortcuts import get_first_object_or_none
from base.templatetags.seahub_tags import at_pattern
from notifications.models import UserNotification
from profile.models import Profile

class UuidObjidMap(models.Model):    
    """
    Model used for store crocdoc uuid and file object id mapping.
    """
    uuid = models.CharField(max_length=40)
    obj_id = models.CharField(max_length=40, unique=True)
        
class FileComment(models.Model):
    """
    Model used for leave comment on file.
    NOTE:
    	Need manually create index for (file_path_hash, repo_id).
    """
    repo_id = models.CharField(max_length=36, db_index=True)
    file_path = models.TextField()
    file_path_hash = models.CharField(max_length=12)
    from_email = models.EmailField()
    message = models.TextField()
    timestamp = models.DateTimeField(default=datetime.datetime.now)

    class Meta:
        ordering = ['-timestamp']

class FileContributors(models.Model):        
    """(repo_id, file path, file_id, contributors)"""

    repo_id = models.CharField(max_length=36, db_index=True)
    file_id = models.CharField(max_length=40)
    
    file_path = models.TextField()
    file_path_hash = models.CharField(max_length=12)

    last_modified = models.BigIntegerField()
    last_commit_id = models.CharField(max_length=40)

    # email addresses seperated by comma
    emails = models.TextField()

class InnerPubMsg(models.Model):
    """
    Model used for leave message on inner pub page.
    """
    from_email = models.EmailField()
    message = models.CharField(max_length=500)
    timestamp = models.DateTimeField(default=datetime.datetime.now)

    class Meta:
        ordering = ['-timestamp']
    
class InnerPubMsgReply(models.Model):
    reply_to = models.ForeignKey(InnerPubMsg)
    from_email = models.EmailField()
    message = models.CharField(max_length=150)
    timestamp = models.DateTimeField(default=datetime.datetime.now)

# @receiver(post_save, sender=InnerPubMsgReply)
def msgreply_save_handler(sender, instance, **kwargs):
    """
    Handle sending notification to '@<user>' when reply messages.
    """
    from_email = instance.from_email
    reply_msg = instance.message
    innerpub_msg = instance.reply_to
    to_user = ''


    m = re.match(at_pattern, reply_msg)
    if m:
        nickname_or_emailprefix = m.group()[1:]
        for member in get_emailusers(-1, -1):
            # For every user, get his username and nickname if
            # it exists, check whether match.
            username = member.email
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
                                             msg_type='innerpubmsg_reply',
                                             detail=innerpub_msg.id)
            except UserNotification.DoesNotExist:
                n = UserNotification(to_user=to_user,
                                     msg_type='innerpubmsg_reply',
                                     detail=innerpub_msg.id)
                n.save()
    
# @receiver(post_save, sender=InnerPubMsg)
def innerpub_msg_added_cb(sender, instance, **kwargs):
    from_email = instance.from_email

    users = get_emailusers(-1, -1)
    for u in users:
        if u.email == from_email:
            continue
        try:
            UserNotification.objects.get(to_user=u.email,
                                         msg_type='innerpub_msg')
        except UserNotification.DoesNotExist:
            n = UserNotification(to_user=u.email, msg_type='innerpub_msg',
                                 detail='')
            n.save()

# @receiver(post_save, sender=InnerPubMsgReply)
def innerpubmsg_reply_added_cb(sender, instance, **kwargs):
    innerpub_msg = instance.reply_to
    from_email = instance.from_email
    msg_id = innerpub_msg.id
    
    if from_email == innerpub_msg.from_email:
        # No need to send notification when reply own message.
        return

    try:
        innerpub_msg = InnerPubMsg.objects.get(id=msg_id)
    except InnerPubMsg.DoesNotExist:
        pass

    try:
        UserNotification.objects.get(to_user=innerpub_msg.from_email,
                                     msg_type='innerpubmsg_reply',
                                     detail=msg_id)
    except UserNotification.DoesNotExist:
        n = UserNotification(to_user=innerpub_msg.from_email,
                             msg_type='innerpubmsg_reply',
                             detail=msg_id)
        n.save()
            
class UserStarredFiles(models.Model):
    """Starred files are marked by users to get quick access to it on user
    home page.

    """

    email = models.EmailField()
    org_id = models.IntegerField()
    repo_id = models.CharField(max_length=36)
    
    path = models.TextField()
    is_dir = models.BooleanField()

class DirFilesLastModifiedInfo(models.Model):
    '''Cache the results of the calculation of last modified time of all the
    files under a directory <parent_dir> in repo <repo_id>.

    The field "last_modified_info" is the json format of a dict whose keys are
    the file names and values are their corresponding last modified
    timestamps.

    The field "dir_id" is used to check whether the cache should be
    re-computed

    '''
    repo_id = models.CharField(max_length=36)
    parent_dir = models.TextField()
    parent_dir_hash = models.CharField(max_length=12)
    dir_id = models.CharField(max_length=40)
    last_modified_info = models.TextField()

    class Meta:
        unique_together = ('repo_id', 'parent_dir_hash')