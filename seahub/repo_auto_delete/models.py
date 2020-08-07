import logging
from django.db import models
from django.dispatch import receiver

from seahub.signals import repo_deleted

logger = logging.getLogger(__name__)

@receiver(repo_deleted)
def remove_repo_auto_del(sender, **kwargs):
    repo_id = kwargs['repo_id']
    try:
        RepoAutoDelete.objects.filter(repo_id=repo_id).delete()
    except Exception as e:
        logger.error(e)


class RepoAutoDelete(models.Model):

    repo_id = models.CharField(max_length=36, db_index=True, unique=True)
    days = models.IntegerField(default=0)

    class Meta:
        db_table = 'repo_auto_delete'
