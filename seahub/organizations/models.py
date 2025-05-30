# Copyright (c) 2012-2016 Seafile Ltd.
import os
import uuid
import logging
from django.db import models

from .settings import ORG_MEMBER_QUOTA_DEFAULT

from seahub.constants import DEFAULT_ORG
from seahub.role_permissions.utils import get_available_roles
from seahub.avatar.util import get_avatar_file_storage
from seahub.avatar.settings import AVATAR_STORAGE_DIR

logger = logging.getLogger(__name__)


FORCE_ADFS_LOGIN = 'force_adfs_login'
DISABLE_ORG_USER_CLEAN_TRASH = 'disable_org_user_clean_trash'
DISABLE_ORG_ENCRYPTED_LIBRARY = 'disable_org_encrypted_library'


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

    def get_is_active_by_org(self, org):
        org_id = org.org_id
        try:
            is_active = self.get(org_id=org_id).is_active
            return is_active
        except OrgSettings.DoesNotExist:
            return True

    def add_or_update(self, org, role=None, is_active=None):
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

        if is_active is not None:
            settings.is_active = is_active

        settings.save(using=self._db)
        return settings


class OrgSettings(models.Model):
    org_id = models.IntegerField(unique=True)
    role = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    objects = OrgSettingsManager()


class OrgSAMLConfigManager(models.Manager):
    def get_config_by_org_id(self, org_id):
        try:
            config = self.get(org_id=org_id)
            return config
        except OrgSAMLConfig.DoesNotExist:
            return None

    def get_config_by_domain(self, domain):
        try:
            config = self.get(domain=domain)
            return config
        except OrgSAMLConfig.DoesNotExist:
            return None


class OrgSAMLConfig(models.Model):
    org_id = models.IntegerField(unique=True)
    metadata_url = models.TextField()
    domain = models.CharField(max_length=255, unique=True, null=True, blank=True)
    dns_txt = models.CharField(max_length=64, null=True, blank=True)
    domain_verified = models.BooleanField(default=False, db_index=True)
    idp_certificate = models.TextField(null=True, blank=True)

    objects = OrgSAMLConfigManager()

    class Meta:
        db_table = 'org_saml_config'

    def to_dict(self):
        return {
            'id': self.pk,
            'org_id': self.org_id,
            'metadata_url': self.metadata_url,
            'domain': self.domain,
            'dns_txt': self.dns_txt,
            'domain_verified': self.domain_verified,
            'idp_certificate': self.idp_certificate,
        }


def _gen_org_logo_path(org_id, image_file):

    (root, ext) = os.path.splitext(image_file.name.lower())
    return '%s/org-logo/%s/%s%s' % (AVATAR_STORAGE_DIR, org_id, uuid.uuid4(), ext)


def _save_org_logo_file(org_id, image_file):

    org_logo_path = _gen_org_logo_path(org_id, image_file)
    storage = get_avatar_file_storage()
    storage.save(org_logo_path, image_file)

    return org_logo_path


def _delete_org_logo_file(org_logo_path):

    storage = get_avatar_file_storage()
    storage.delete(org_logo_path)


class OrgAdminSettingsManager(models.Manager):

    def save_org_logo(self, org_id, image_file):

        obj = self.filter(org_id=org_id, key='org_logo_path').first()
        if obj and obj.value:  # delete old file
            _delete_org_logo_file(obj.value)
        if not obj:
            obj = self.model(org_id=org_id, key='org_logo_path')

        obj.value = _save_org_logo_file(org_id, image_file)
        obj.save()

        return obj

    def get_org_logo_url(self, org_id):

        obj = self.filter(org_id=org_id, key='org_logo_path').first()
        if not obj:
            return ''

        return obj.value


class OrgAdminSettings(models.Model):

    # boolean settings / str settings / int settings, etc
    # key: default-value

    org_id = models.IntegerField(db_index=True, null=False)
    key = models.CharField(max_length=255, null=False)
    value = models.TextField()

    objects = OrgAdminSettingsManager()

    class Meta:
        unique_together = [('org_id', 'key')]
