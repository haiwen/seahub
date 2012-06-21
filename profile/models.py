from django.db import models

class Profile(models.Model):
    user = models.EmailField(unique=True)
    nickname = models.CharField(max_length=64, blank=True)
    intro = models.TextField(max_length=256, blank=True)

