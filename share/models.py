from django.db import models
from django.contrib.auth.models import User

class UserShare(models.Model):
    """Record a repo shared to a user."""

    from_user = models.ForeignKey(User, related_name="myshare_items")
    to_user = models.ForeignKey(User, related_name="share2me_items")
    repo_id = models.CharField(max_length=36)


class GroupShare(models.Model):
    """A repo shared to a group."""

    group_id = models.CharField(max_length=36)
    repo_id = models.CharField(max_length=36)

    class Meta:
        unique_together = ("group_id", "repo_id")
