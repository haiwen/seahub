# -*- coding: utf-8 -*-
import json

from django.core.urlresolvers import reverse
from django.utils.translation import ugettext as _
from seaserv import seafile_api, ccnet_api

from seahub.dtable.models import Workspaces, DTableShare, DTables
from seahub.test_utils import BaseTestCase

GROUP_DOMAIN = '@seafile_group'


class DTableRelatedUsersViewTest(BaseTestCase):

    def setUp(self):
        # add user to group
        self.login_as(self.user)
        self.group_id = self.group.id
        self.endpoint = reverse('api-v2.1-group-members', args=[self.group_id])
        self.client.post(self.endpoint, {
            'email': self.user.username
        })
        self.logout()

        # create group workspace
        group_repo_id = seafile_api.create_repo(
            _("My Workspace"),
            _("My Workspace"),
            "dtable@seafile"
        )
        self.group_workspace = Workspaces.objects.create_workspace(
            str(self.group_id) + GROUP_DOMAIN, group_repo_id
        )
        assert Workspaces.objects.all().count() == 1

        # create group dtable
        seafile_api.post_empty_file(
            group_repo_id, '/', 'group.dtable', self.user.username
        )
        self.group_dtable = DTables.objects.create_dtable(
            self.user.username, self.group_workspace, 'group'
        )
        assert DTables.objects.all().count() == 1

        # share group dtable to admin
        DTableShare.objects.add(
            self.group_dtable, str(self.group_id) + GROUP_DOMAIN, self.admin.username, 'rw'
        )
        assert DTableShare.objects.all().count() == 1

        self.url = reverse(
            'api-v2.1-dtable-related-users', args=[self.group_workspace.id, self.group_dtable.name]
        )

    def tearDown(self):
        self.remove_group()
        self.remove_repo()

    def test_can_get(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        user_list = json_resp.get('user_list')

        assert user_list
        assert len(user_list) == 2

        usernames = [user_info.get('email') for user_info in user_list]
        assert self.user.username in usernames
        assert self.admin.username in usernames
