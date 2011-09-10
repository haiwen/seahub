from django.db import models

# Create your models here.

class GroupRepo(models.Model):
    """A repo shared to a group."""

    group_id = models.CharField(max_length=36)
    repo_id = models.CharField(max_length=36)
    repo_location = models.CharField(max_length=40, blank=True)

    class Meta:
        unique_together = ("group_id", "repo_id")
