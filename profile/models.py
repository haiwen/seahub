from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.EmailField(unique=True)
    nickname = models.CharField(max_length=256, blank=True)
    intro = models.TextField(max_length=256, blank=True)

