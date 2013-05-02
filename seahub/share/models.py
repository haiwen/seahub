import datetime
from django.db import models

class AnonymousShare(models.Model):
    """
    Model used for sharing repo to unregistered email.
    """
    repo_owner = models.EmailField(max_length=255)
    repo_id = models.CharField(max_length=36)
    anonymous_email = models.EmailField(max_length=255)
    token = models.CharField(max_length=25, unique=True)

class FileShare(models.Model):
    """
    Model used for file or dir shared link.
    """
    username = models.EmailField(max_length=255, db_index=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    token = models.CharField(max_length=10, unique=True)
    ctime = models.DateTimeField(default=datetime.datetime.now)
    view_cnt = models.IntegerField(default=0)
    s_type = models.CharField(max_length=2, db_index=True, default='f') # `f` or `d`
