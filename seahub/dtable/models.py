# -*- coding: utf-8 -*-

import uuid
import hmac
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from hashlib import sha1
import datetime

from django.db import models
from constance import config

from seaserv import seafile_api, SERVICE_URL

from seahub.base.fields import LowerCaseCharField
from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE
from seahub.utils import gen_token
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname


class WorkspacesManager(models.Manager):

    def get_workspace_by_owner(self, owner):
        try:
            return super(WorkspacesManager, self).get(owner=owner)
        except self.model.DoesNotExist:
            return None

    def get_workspace_by_id(self, workspace_id):
        try:
            return super(WorkspacesManager, self).get(pk=workspace_id)
        except self.model.DoesNotExist:
            return None

    def create_workspace(self, owner, repo_id):
        try:
            return super(WorkspacesManager, self).get(owner=owner, repo_id=repo_id)
        except self.model.DoesNotExist:
            workspace = self.model(owner=owner, repo_id=repo_id)
            workspace.save()
            return workspace

    def delete_workspace(self, workspace_id):
        try:
            workspace = super(WorkspacesManager, self).get(pk=workspace_id)
            workspace.delete()
            return True
        except self.model.DoesNotExist:
            return False


class Workspaces(models.Model):
    name = models.CharField(max_length=255, null=True)
    owner = models.CharField(max_length=255, unique=True)
    repo_id = models.CharField(max_length=36, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = WorkspacesManager()

    class Meta:
        db_table = 'workspaces'

    @property
    def updated_at(self):
        assert len(self.repo_id) == 36

        repo = seafile_api.get_repo(self.repo_id)
        if not repo:
            return ''

        return timestamp_to_isoformat_timestr(repo.last_modify)

    def to_dict(self):
        return {
            'id': self.pk,
            'repo_id': self.repo_id,
        }


class DTablesManager(models.Manager):

    def get_dtable_by_workspace(self, workspace):
        try:
            dtables = super(DTablesManager, self).filter(workspace=workspace)
            dtable_list = list()
            for dtable in dtables:
                dtable_dict = dict()
                dtable_dict['id'] = dtable.pk
                dtable_dict['workspace_id'] = dtable.workspace_id
                dtable_dict['uuid'] = dtable.uuid
                dtable_dict['name'] = dtable.name
                dtable_dict['creator'] = email2nickname(dtable.creator)
                dtable_dict['modifier'] = email2nickname(dtable.modifier)
                dtable_dict['created_at'] = datetime_to_isoformat_timestr(dtable.created_at)
                dtable_dict['updated_at'] = datetime_to_isoformat_timestr(dtable.updated_at)
                dtable_list.append(dtable_dict)
            return dtable_list
        except self.model.DoesNotExist:
            return None

    def create_dtable(self, username, workspace, name):
        try:
            return super(DTablesManager, self).get(workspace=workspace, name=name)
        except self.model.DoesNotExist:
            dtable = self.model(workspace=workspace, name=name,
                                creator=username, modifier=username)
            dtable.save()
            return dtable

    def get_dtable(self, workspace, name):
        try:
            return super(DTablesManager, self).get(workspace=workspace, name=name)
        except self.model.DoesNotExist:
            return None

    def get_dtable_by_uuid(self, dtable_uuid):
        try:
            return super(DTablesManager, self).get(uuid=dtable_uuid)
        except self.model.DoesNotExist:
            return None

    def delete_dtable(self, workspace, name):
        try:
            dtable = super(DTablesManager, self).get(workspace=workspace, name=name)
            dtable.delete()
            return True
        except self.model.DoesNotExist:
            return False


class DTables(models.Model):
    workspace = models.ForeignKey(Workspaces, on_delete=models.CASCADE, db_index=True)
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    creator = models.CharField(max_length=255)
    modifier = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = DTablesManager()

    class Meta:
        unique_together = (('workspace', 'name'),)
        db_table = 'dtables'

    def to_dict(self):
        return {
            'id': self.pk,
            'workspace_id': self.workspace_id,
            'uuid': self.uuid,
            'name': self.name,
            'creator': email2nickname(self.creator),
            'modifier': email2nickname(self.modifier),
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'updated_at': datetime_to_isoformat_timestr(self.updated_at),
        }


class DTableShareManager(models.Manager):

    def list_by_dtable(self, dtable):
        return self.filter(dtable=dtable)

    def list_by_to_user(self, to_user):
        return self.filter(to_user=to_user).select_related('dtable')

    def get_by_dtable_and_to_user(self, dtable, to_user):
        qs = self.filter(dtable=dtable, to_user=to_user)
        if qs.exists():
            return qs[0]
        return None

    def add(self, dtable, from_user, to_user, permission):
        obj = self.model(
            dtable=dtable, from_user=from_user, to_user=to_user, permission=permission)
        obj.save()
        return obj


class DTableShare(models.Model):
    """Model used to dtable share

     from_user, to_user: user email or group_id@seafile_group
    """
    id = models.BigAutoField(primary_key=True)
    dtable = models.ForeignKey(DTables, on_delete=models.CASCADE)
    from_user = models.CharField(max_length=255, db_index=True)
    to_user = models.CharField(max_length=255, db_index=True)
    permission = models.CharField(max_length=15)

    objects = DTableShareManager()

    class Meta:
        unique_together = (('dtable', 'to_user'),)
        db_table = 'dtable_share'


class DTableAPITokenManager(models.Manager):

    def get_by_token(self, token):
        qs = self.filter(token=token)
        if qs.exists():
            return qs[0]
        return None

    def get_by_dtable_and_app_name(self, dtable, app_name):
        qs = self.filter(dtable=dtable, app_name=app_name)
        if qs.exists():
            return qs[0]
        return None

    def list_by_dtable(self, dtable):
        return self.filter(dtable=dtable)

    def generate_key(self):
        unique = str(uuid.uuid4())
        return hmac.new(unique.encode('utf-8'), digestmod=sha1).hexdigest()

    def add(self, dtable, app_name, email, permission):

        obj = self.model(
            dtable=dtable,
            app_name=app_name,
            generated_by=email,
            permission=permission,
        )
        obj.token = self.generate_key()
        obj.save()
        return obj


class DTableAPIToken(models.Model):
    """dtable api token for thirdpart apps to get dtable-server access token
    """
    dtable = models.ForeignKey(DTables, on_delete=models.CASCADE)
    app_name = models.CharField(max_length=255, db_index=True)
    token = models.CharField(unique=True, max_length=40)
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.CharField(max_length=255)
    last_access = models.DateTimeField(auto_now=True)
    permission = models.CharField(max_length=15)

    objects = DTableAPITokenManager()

    class Meta:
        unique_together = (('dtable', 'app_name'),)
        db_table = 'dtable_api_token'

    def update_last_access(self):
        self.last_access = datetime.datetime.now
        self.save(update_fields=['last_access'])


class DTableShareLinksManager(models.Manager):

    def create_link(self, dtable_id, username,
                    password=None, expire_date=None, permission='r'):
        if password:
            password = make_password(password)
        token = gen_token(max_length=config.SHARE_LINK_TOKEN_LENGTH)
        sdl = super(DTableShareLinksManager, self).create(dtable_id=dtable_id, username=username,
                                                          token=token,
                                                          permission=permission,
                                                          expire_date=expire_date, password=password)
        return sdl


class DTableShareLinks(models.Model):

    PERMISSION_CHOICES = (
        (PERMISSION_READ, 'read only'),
        (PERMISSION_READ_WRITE, 'read and write')
    )

    dtable = models.ForeignKey(DTables, on_delete=models.CASCADE, db_index=True, db_column='dtable_id')
    username = LowerCaseCharField(max_length=255, db_index=True)
    token = models.CharField(max_length=100, unique=True)
    ctime = models.DateTimeField(default=datetime.datetime.now)
    password = models.CharField(max_length=128, null=True)
    expire_date = models.DateTimeField(null=True)
    permission = models.CharField(max_length=50, db_index=True,
                                  choices=PERMISSION_CHOICES,
                                  default=PERMISSION_READ)

    objects = DTableShareLinksManager()

    class Meta:
        db_table = 'dtable_share_links'

    def is_owner(self, username):
        return self.username == username

    def is_expired(self):
        if not self.expire_date:
            return False
        else:
            return self.expire_date < timezone.now()


class DTableFormLinksManager(models.Manager):

    def add_dtable_form_link(self, username, workspace_id, dtable_uuid, form_id):
        token = uuid.uuid4()
        form_link_obj = self.model(
            username=username,
            workspace_id=workspace_id,
            dtable_uuid=dtable_uuid,
            form_id=form_id,
            token=token
        )
        form_link_obj.save()
        form_link = form_link_obj.to_dict()
        form_link["form_link"] = "%s/dtable/forms/%s" % (SERVICE_URL, token)
        return form_link

    def get_dtable_form_link(self, dtable_uuid, form_id):
        form_links = self.filter(dtable_uuid=dtable_uuid, form_id=form_id)
        if len(form_links) > 0:
            form_link_obj = form_links[0]
            form_link = form_link_obj.to_dict()
            form_link["form_link"] = "%s/dtable/forms/%s" % \
                                     (SERVICE_URL, form_link_obj.token)
            return form_link
        else:
            return None

    def get_dtable_form_link_by_token(self, token):
        try:
            return self.get(token=token)
        except self.model.DoesNotExist:
            return None

    def delete_dtable_form_link(self, token):
        try:
            form_link = self.get(token=token)
            form_link.delete()
            return True
        except self.model.DoesNotExist:
            return False


class DTableFormLinks(models.Model):

    username = models.CharField(max_length=255, db_index=True)
    workspace_id = models.IntegerField(db_index=True)
    dtable_uuid = models.CharField(max_length=36, db_index=True)
    form_id = models.CharField(max_length=36)
    token = models.CharField(max_length=36, unique=True)

    objects = DTableFormLinksManager()

    class Meta:
        unique_together = (('dtable_uuid', 'form_id'),)
        db_table = 'dtable_form_links'

    def to_dict(self):

        return {
            'id': self.pk,
            'username': self.username,
            'workspace_id': self.workspace_id,
            'dtable_uuid': self.dtable_uuid,
            'form_id': self.form_id,
            'token': self.token,
        }


class DTableRowSharesManager(models.Manager):
    def add_dtable_row_share(self, username, workspace_id, dtable_uuid, table_id, row_id):
        token = uuid.uuid4()
        row_share_obj = self.model(
            username=username,
            workspace_id=workspace_id,
            dtable_uuid=dtable_uuid,
            table_id=table_id,
            row_id=row_id,
            token=token
        )
        row_share_obj.save()
        row_share = row_share_obj.to_dict()
        row_share["row_share_link"] = "%s/dtable/row-share-links/%s" % (SERVICE_URL, token)
        return row_share

    def get_dtable_row_share(self, username, workspace_id, dtable_uuid, table_id, row_id):
        row_shares = super(DTableRowSharesManager, self).filter(
            username=username,
            workspace_id=workspace_id,
            dtable_uuid=dtable_uuid,
            table_id=table_id,
            row_id=row_id
        )
        if len(row_shares) > 0:
            row_share_obj = row_shares[0]
            row_share = row_share_obj.to_dict()
            row_share["row_share_link"] = "%s/dtable/row-share-links/%s" % \
                                          (SERVICE_URL, row_share_obj.token)
            return row_share
        else:
            return None

    def get_dtable_row_share_by_token(self, token):
        try:
            return super(DTableRowSharesManager, self).get(token=token)
        except self.model.DoesNotExist:
            return None

    def delete_dtable_row_share(self, token):
        try:
            row_share = super(DTableRowSharesManager, self).get(token=token)
            row_share.delete()
            return True
        except self.model.DoesNotExist:
            return False


class DTableRowShares(models.Model):

    username = models.CharField(max_length=255, db_index=True)
    workspace_id = models.IntegerField(db_index=True)
    dtable_uuid = models.CharField(max_length=36, db_index=True)
    table_id = models.CharField(max_length=36)
    row_id = models.CharField(max_length=36, db_index=True)
    token = models.CharField(max_length=100, unique=True)

    objects = DTableRowSharesManager()

    class Meta:
        db_table = 'dtable_row_shares'

    def to_dict(self):

        return {
            'id': self.pk,
            'username': self.username,
            'workspace_id': self.workspace_id,
            'dtable_uuid': self.dtable_uuid,
            'table_id': self.table_id,
            'row_id': self.row_id,
            'token': self.token,
        }
