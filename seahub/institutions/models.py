# Copyright (c) 2012-2016 Seafile Ltd.
from django.db import models
from django.utils import timezone


class Institution(models.Model):
    name = models.CharField(max_length=200)
    create_time = models.DateTimeField(default=timezone.now)


class InstitutionAdmin(models.Model):
    institution = models.ForeignKey(Institution)
    user = models.EmailField()


class InstitutionQuotaManager(models.Manager):
    def get_or_none(self, *args, **kwargs):
        try:
            return self.get(*args, **kwargs).quota
        except self.model.DoesNotExist:
            return None


class InstitutionQuota(models.Model):
    institution = models.ForeignKey(Institution)
    quota = models.BigIntegerField()
    objects = InstitutionQuotaManager()
