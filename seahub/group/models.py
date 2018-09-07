# Copyright (c) 2012-2016 Seafile Ltd.
import datetime
import os
import re
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from seaserv import get_group_members

from seahub.base.fields import LowerCaseCharField
from seahub.shortcuts import get_first_object_or_none
from seahub.profile.models import Profile

class GroupMessage(models.Model):
    group_id = models.IntegerField(db_index=True)
    from_email = LowerCaseCharField(max_length=255)
    message = models.TextField()
    timestamp = models.DateTimeField(default=datetime.datetime.now)

class MessageReply(models.Model):
    reply_to = models.ForeignKey(GroupMessage)
    from_email = LowerCaseCharField(max_length=255)
    message = models.TextField()
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

class PublicGroup(models.Model):
    """
    To record a public group
    """
    group_id = models.IntegerField(db_index=True)
