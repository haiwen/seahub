import datetime
from django.db import models


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
