import logging
from django.db import models

logger = logging.getLogger(__name__)

class RepoMetadata(models.Model):

    repo_id = models.CharField(max_length=36, primary_key=True, db_index=True)
    modify_time = models.DateTimeField(auto_now=True)
    enabled = models.BooleanField()

    class Meta:
        db_table = 'repo_metadata'
