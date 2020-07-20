# Copyright (c) 2012-2016 Seafile Ltd.
from django.db import models
from django.utils import timezone

from seahub.base.fields import LowerCaseCharField

class InstitutionManager(models.Manager):
    def add_institution(self, name):
        institution = super(InstitutionManager, self).create(name=name)
        institution.save()

        return institution

class Institution(models.Model):
    name = models.CharField(max_length=200)
    create_time = models.DateTimeField(default=timezone.now)
    objects = InstitutionManager()

class InstitutionAdmin(models.Model):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    user = LowerCaseCharField(max_length=255, db_index=True)


class InstitutionQuotaManager(models.Manager):
    def get_or_none(self, *args, **kwargs):
        try:
            return self.get(*args, **kwargs).quota
        except self.model.DoesNotExist:
            return None


class InstitutionQuota(models.Model):
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    quota = models.BigIntegerField()
    objects = InstitutionQuotaManager()
