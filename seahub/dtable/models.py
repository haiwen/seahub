# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.db import models
from seaserv import seafile_api

from seahub.base.fields import LowerCaseCharField
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr


class WorkSpacesManager(models.Manager):

    def get_workspaces_by_owner(self, owner):
        try:
            return super(WorkSpacesManager, self).filter(owner=owner)
        except self.model.DoesNotExist:
            return None

    def get_workspace_by_id(self, workspace_id):
        try:
            return super(WorkSpacesManager, self).get(pk=workspace_id)
        except self.model.DoesNotExist:
            return None

    def create_workspace(self, name, owner, repo_id):
        try:
            return super(WorkSpacesManager, self).get(name=name, owner=owner, repo_id=repo_id)
        except self.model.DoesNotExist:
            workspace = self.model(name=name, owner=owner, repo_id=repo_id)
            workspace.save()
            return workspace

    def delete_workspace(self, workspace_id):
        try:
            workspace = super(WorkSpacesManager, self).get(pk=workspace_id)
            workspace.delete()
            return True
        except self.model.DoesNotExist:
            return False


class WorkSpaces(models.Model):

    name = LowerCaseCharField(max_length=255)
    owner = models.CharField(max_length=255)
    repo_id = models.CharField(max_length=36, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    objects = WorkSpacesManager()

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
