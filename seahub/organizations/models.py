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
                logger.warning('Role %s is not valid' % role)
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
                logger.warning('Role %s is not valid' % role)

        settings.save(using=self._db)
        return settings


class OrgSettings(models.Model):
    org_id = models.IntegerField(unique=True)
    role = models.CharField(max_length=100, null=True, blank=True)

    objects = OrgSettingsManager()


class OrgSAMLConfigManager(models.Manager):

    def add_or_update_saml_config(
            self, org_id, metadata_url, single_sign_on_service,
            single_logout_service, valid_days
    ):
        try:
            saml_config = self.get(org_id=org_id)
        except OrgSAMLConfig.DoesNotExist:
            saml_config = self.model(org_id=org_id)

        if metadata_url:
            saml_config.metadata_url = metadata_url
        if single_sign_on_service:
            saml_config.single_sign_on_service = single_sign_on_service
        if single_logout_service:
            saml_config.single_logout_service = single_logout_service
        if valid_days:
            saml_config.valid_days = valid_days

        saml_config.save(using=self._db)
        return saml_config

    def get_config_by_org_id(self, org_id):
        try:
            config = self.get(org_id=org_id)
            return config
        except OrgSAMLConfig.DoesNotExist:
            return None


class OrgSAMLConfig(models.Model):
    org_id = models.IntegerField(unique=True)
    metadata_url = models.TextField()
    single_sign_on_service = models.TextField()
    single_logout_service = models.TextField()
    valid_days = models.IntegerField()

    objects = OrgSAMLConfigManager()

    class Meta:
        db_table = 'org_saml_config'

    def to_dict(self):
        return {
            'id': self.pk,
            'org_id': self.org_id,
            'metadata_url': self.metadata_url,
            'single_sign_on_service': self.single_sign_on_service,
            'single_logout_service': self.single_logout_service,
            'valid_days': self.valid_days,
        }
