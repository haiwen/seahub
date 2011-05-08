from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.ForeignKey(User, unique=True)
    ccnet_user_id = models.CharField(max_length=40, blank=True)

