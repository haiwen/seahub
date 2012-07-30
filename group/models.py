import datetime
import os

from django.db import models

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
