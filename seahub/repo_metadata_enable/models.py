import logging
from django.db import models

logger = logging.getLogger(__name__)

class RepoMetadataEnable(models.Model):

    repo_id = models.CharField(max_length=36, db_index=True)

    class Meta:
        db_table = 'repo_metadata_enable'
