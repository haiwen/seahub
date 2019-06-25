# -*- coding: utf-8 -*-
from django.core.urlresolvers import reverse
from seahub.dtable.models import Workspaces
from seahub.test_utils import BaseTestCase


class WorkspacesManagerTest(BaseTestCase):

    def test_get_workspace_by_owner(self):
        assert len(Workspaces.objects.all()) == 0
        Workspaces.objects.create_workspace(self.user.username, self.repo.id)

        workspace = Workspaces.objects.get_workspace_by_owner(self.user.username)

        assert workspace is not None
        assert len(Workspaces.objects.all()) == 1

    def test_get_workspace_by_id(self):
        assert len(Workspaces.objects.all()) == 0
        workspace = Workspaces.objects.create_workspace(self.user.username, self.repo.id)

        assert workspace is not None
        workspace_id = workspace.id

        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        assert workspace is not None

    def test_delete_workspace(self):
        assert len(Workspaces.objects.all()) == 0
        workspace = Workspaces.objects.create_workspace(self.user.username, self.repo.id)

        assert len(Workspaces.objects.all()) == 1
        workspace_id = workspace.id

        Workspaces.objects.delete_workspace(workspace_id)
        assert len(Workspaces.objects.all()) == 0
