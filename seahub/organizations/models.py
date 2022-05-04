# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from django.db import models

from .settings import ORG_MEMBER_QUOTA_DEFAULT
from seahub.constants import DEFAULT_ORG
from seahub.role_permissions.utils import get_available_roles

logger = logging.getLogger(__name__)


class OrgMemberQuotaManager(models.Manager):
    def get_quota(self, org_id):
        try:
            return self.get(org_id=org_id).quota
        except self.model.DoesNotExist:
            return ORG_MEMBER_QUOTA_DEFAULT

    def set_quota(self, org_id, quota):
        try:
            q = self.get(org_id=org_id)
            q.quota = quota
        except self.model.DoesNotExist:
            q = self.model(org_id=org_id, quota=quota)
        q.save(using=self._db)
        return q

class OrgMemberQuota(models.Model):
    org_id = models.IntegerField(db_index=True)
    quota = models.IntegerField()

    objects = OrgMemberQuotaManager()


class OrgSettingsManager(models.Manager):
    def get_by_orgs(self, orgs):
        org_ids = [x.org_id for x in orgs]
        return self.filter(org_id__in=org_ids)

    def get_role_by_org(self, org):
        org_id = org.org_id
        try:
            role = self.get(org_id=org_id).role
        except OrgSettings.DoesNotExist:
            return DEFAULT_ORG
        else:
            if role is None:
                return DEFAULT_ORG

            if role in get_available_roles():
                return role
            else:
                logger.warn('Role %s is not valid' % role)
                return DEFAULT_ORG

    def add_or_update(self, org, role=None):
        org_id = org.org_id
        try:
            settings = self.get(org_id=org_id)
        except OrgSettings.DoesNotExist:
            settings = self.model(org_id=org_id)

        if role is not None:
            if role in get_available_roles():
                settings.role = role
            else:
                logger.warn('Role %s is not valid' % role)

        settings.save(using=self._db)
        return settings


class OrgSettings(models.Model):
    org_id = models.IntegerField(unique=True)
    role = models.CharField(max_length=100, null=True, blank=True)

    objects = OrgSettingsManager()
