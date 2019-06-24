# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.db import models

from seaserv import seafile_api
from seahub.tags.models import FileUUIDMap
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr


class WorkspacesManager(models.Manager):

    def get_workspaces_by_owner(self, owner):
        try:
            return super(WorkspacesManager, self).filter(owner=owner)
        except self.model.DoesNotExist:
            return None

    def get_workspace_by_id(self, workspace_id):
        try:
            return super(WorkspacesManager, self).get(pk=workspace_id)
        except self.model.DoesNotExist:
            return None

    def create_workspace(self, name, owner, repo_id):
        try:
            return super(WorkspacesManager, self).get(name=name, owner=owner, repo_id=repo_id)
        except self.model.DoesNotExist:
            workspace = self.model(name=name, owner=owner, repo_id=repo_id)
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
    name = models.CharField(max_length=255)
    owner = models.CharField(max_length=255)
    repo_id = models.CharField(max_length=36, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    objects = WorkspacesManager()

    class Meta:
        unique_together = (('owner', 'repo_id'),)
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
            'name': self.name,
            'owner': self.owner,
            'repo_id': self.repo_id,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
        }


class ShareDTableManager(models.Manager):

    def list_by_uuid(self, uuid):
        return self.filter(uuid=uuid)

    def list_by_to_user(self, to_user):
        return self.filter(to_user=to_user).select_related('uuid', 'workspace')

    def get_by_uuid_and_to_user(self, uuid, to_user):
        qs = self.filter(uuid=uuid, to_user=to_user)
        if qs.exists():
            return qs[0]
        return None

    def add(self, uuid, from_user, to_user, permission):
        obj = self.model(uuid=uuid, from_user=from_user, to_user=to_user, permission=permission)
        obj.save()
        return obj


class ShareDTable(models.Model):
    """Model used to share dtable

    from_user, to_user: user email or group_id@seafile_group
    """
    id = models.BigAutoField(primary_key=True)
    uuid = models.ForeignKey(FileUUIDMap, on_delete=models.CASCADE)
    workspace = models.ForeignKey(Workspaces, on_delete=models.CASCADE)
    from_user = models.CharField(max_length=255, db_index=True)
    to_user = models.CharField(max_length=255, db_index=True)
    permission = models.CharField(max_length=15)

    objects = ShareDTableManager()

    class Meta:
        unique_together = (('uuid', 'to_user'),)
