import datetime
from django.db import models

# Create your models here.

class TrashCleanedItemsManager(models.Manager):

    def add_item(self, repo_id, path):

        trash = TrashCleanedItems.objects.create(
                repo_id=repo_id, path=path)
        return trash

    def get_items_by_repo(self, repo_id):

        return TrashCleanedItems.objects.filter(repo_id=repo_id)

class TrashCleanedItems(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    datetime = models.DateTimeField(
            default=datetime.datetime.now, db_index=True)

    objects = TrashCleanedItemsManager()

    class Meta:
        unique_together = ('repo_id', 'datetime',)
        ordering = ["-datetime"]
