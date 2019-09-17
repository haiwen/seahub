# -*- coding: utf-8 -*-

import uuid

from django.db import models

from seaserv import seafile_api

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

    def get_dtable_by_uuid(self, uuid):
        try:
            return super(DTablesManager, self).get(uuid=uuid)
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


class DTableApiToken(models.Model):
    """dtable api token for thirdpart apps to get dtable-server access token
    """
    dtable_uuid = models.UUIDField(db_index=True)
    app_name = models.CharField(max_length=255, db_index=True)
    token = models.CharField(unique=True, max_length=40)
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.CharField(max_length=255)
    last_access = models.DateTimeField(auto_now=True)

    objects = DTableShareManager()

    class Meta:
        unique_together = (('dtable_uuid', 'app_name'),)
        db_table = 'dtable_api_token'
