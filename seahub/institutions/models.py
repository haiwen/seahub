from django.db import models
from django.utils import timezone


class Institution(models.Model):
    name = models.CharField(max_length=200)
    create_time = models.DateTimeField(default=timezone.now)


class InstitutionAdmin(models.Model):
    institution = models.ForeignKey(Institution)
    user = models.EmailField()
