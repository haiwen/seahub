import json

from django.utils.translation import ugettext as _
from django.core.urlresolvers import reverse
from seahub.dtable.models import Workspaces, DTableShare, DTables
from seaserv import seafile_api

from seahub.test_utils import BaseTestCase
from seahub.base.templatetags.seahub_tags import email2nickname
from tests.common.utils import randstring

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

GROUP_DOMAIN = '@seafile_group'


class SharedDTablesViewTest(BaseTestCase):
    def setUp(self):
        # create workspace
        self.workspace = Workspaces.objects.create_workspace(
            self.user.username, self.repo.id)
        assert len(Workspaces.objects.all()) == 1
        # create dtable
        seafile_api.post_empty_file(
            self.repo.id, '/', 'dtable1.dtable', self.user.username)
        self.dtable = DTables.objects.create_dtable(
            self.user.username, self.workspace, 'dtable1')
        assert len(DTables.objects.all()) == 1
        # share dtable to admin
        DTableShare.objects.add(
            self.dtable, self.user.username, self.admin.username, 'rw')
        assert len(DTableShare.objects.all()) == 1

        self.url = reverse('api-v2.1-dtables-share')

    def tearDown(self):
        workspace = Workspaces.objects.get_workspace_by_owner(self.user.username)
        workspace_id = workspace.id
        Workspaces.objects.delete_workspace(workspace_id)

        self.remove_repo()

    def test_can_list(self):
        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp["table_list"]
        assert json_resp["table_list"][0]
        assert json_resp['table_list'][0]['workspace_id'] == self.workspace.id
        assert json_resp['table_list'][0]['uuid']
        assert json_resp['table_list'][0]['creator'] == email2nickname(self.user.username)
        assert json_resp['table_list'][0]['created_at']
        assert json_resp['table_list'][0]['permission'] == 'rw'
        assert json_resp['table_list'][0]['updated_at']
        assert json_resp['table_list'][0]['from_user'] == self.user.username
        assert json_resp['table_list'][0]['from_user_name'] == email2nickname(self.user.username)
        assert json_resp['table_list'][0]['modifier'] == email2nickname(self.user.username)
        assert json_resp['table_list'][0]['id']
        assert json_resp['table_list'][0]['name'] == 'dtable1'


class DTableShareViewTest(BaseTestCase):
    def setUp(self):
        # create workspace
        self.workspace = Workspaces.objects.create_workspace(
            self.user.username, self.repo.id)
        assert len(Workspaces.objects.all()) == 1
        # create dtable
        seafile_api.post_empty_file(
            self.repo.id, '/', 'dtable1.dtable', self.user.username)
        self.dtable = DTables.objects.create_dtable(
            self.user.username, self.workspace, 'dtable1')
        assert len(DTables.objects.all()) == 1
        # share dtable to admin
        DTableShare.objects.add(
            self.dtable, self.user.username, self.admin.username, 'rw')
        assert len(DTableShare.objects.all()) == 1

        self.url = reverse('api-v2.1-dtable-share', args=[self.workspace.id, self.dtable.name])

        # add user to group
        self.login_as(self.user)
        self.group_id = self.group.id
        self.endpoint = reverse('api-v2.1-group-members', args=[self.group_id])
        self.client.post(self.endpoint, {
            'email': self.user.email
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
        assert len(Workspaces.objects.all()) == 2

        # create group dtable
        seafile_api.post_empty_file(
            group_repo_id, '/', 'group.dtable', self.user.username
        )
        self.group_dtable = DTables.objects.create_dtable(
            self.user.username, self.group_workspace, 'group'
        )
        assert len(DTables.objects.all()) == 2

        # share group dtable to admin
        DTableShare.objects.add(
            self.group_dtable, str(self.group_id) + GROUP_DOMAIN, self.admin.username, 'rw'
        )
        assert len(DTableShare.objects.all()) == 2

        self.url2 = reverse(
            'api-v2.1-dtable-share', args=[self.group_workspace.id, self.group_dtable.name]
        )

    def tearDown(self):
        workspace = Workspaces.objects.get_workspace_by_owner(self.user.username)
        workspace_id = workspace.id
        Workspaces.objects.delete_workspace(workspace_id)

        self.remove_repo()
        self.remove_group()

    def test_can_post(self):
        assert len(DTableShare.objects.all()) == 2
        DTableShare.objects.all().delete()
        assert len(DTableShare.objects.all()) == 0

        self.login_as(self.user)

        data = {
            'email': self.admin.username,
            'permission': 'rw',
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(201, resp.status_code)
        assert len(DTableShare.objects.all()) == 1

    def test_can_post_group_share(self):
        assert len(DTableShare.objects.all()) == 2
        DTableShare.objects.all().delete()
        assert len(DTableShare.objects.all()) == 0

        self.login_as(self.user)

        data = {
            'email': self.admin.username,
            'permission': 'rw',
        }

        resp = self.client.post(self.url2, data)
        self.assertEqual(201, resp.status_code)
        assert len(DTableShare.objects.all()) == 1

    def test_can_not_post_with_already_share(self):
        assert len(DTableShare.objects.all()) == 2

        self.login_as(self.user)

        data = {
            'email': self.admin.username,
            'permission': 'rw',
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(409, resp.status_code)

    def test_can_not_post_with_not_owner(self):
        assert len(DTableShare.objects.all()) == 2
        DTableShare.objects.all().delete()
        assert len(DTableShare.objects.all()) == 0

        self.login_as(self.admin)

        data = {
            'email': self.admin.username,
            'permission': 'rw',
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(403, resp.status_code)

    def test_can_not_post_with_share_to_owner(self):
        assert len(DTableShare.objects.all()) == 2
        DTableShare.objects.all().delete()
        assert len(DTableShare.objects.all()) == 0

        self.login_as(self.user)

        data = {
            'email': self.user.username,
            'permission': 'rw',
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

    def test_can_not_post_to_group_member(self):
        assert len(DTableShare.objects.all()) == 2
        DTableShare.objects.all().delete()
        assert len(DTableShare.objects.all()) == 0

        self.login_as(self.user)

        data = {
            'email': self.user.username,
            'permission': 'rw',
        }
        resp = self.client.post(self.url2, data)
        self.assertEqual(400, resp.status_code)

    def test_can_not_post_with_share_to_org_user(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        assert len(DTableShare.objects.all()) == 2
        DTableShare.objects.all().delete()
        assert len(DTableShare.objects.all()) == 0

        self.login_as(self.user)

        data = {
            'email': self.org_user.username,
            'permission': 'rw',
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

    def test_can_get(self):
        self.login_as(self.user)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp["user_list"]
        assert json_resp["user_list"][0]
        assert json_resp["user_list"][0]
        assert json_resp["user_list"][0]['permission'] == 'rw'
        assert json_resp["user_list"][0]['avatar_url']
        assert json_resp["user_list"][0]['contact_email'] == self.admin.username
        assert json_resp["user_list"][0]['email'] == self.admin.username
        assert json_resp["user_list"][0]['name'] == email2nickname(self.admin.username)

    def test_can_not_get_with_not_owner(self):
        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_can_put(self):
        self.login_as(self.user)

        data = {
            'email': self.admin.username,
            'permission': 'r',
        }
        resp = self.client.put(self.url, json.dumps(data), 'application/json')
        self.assertEqual(200, resp.status_code)

        assert DTableShare.objects.get_by_dtable_and_to_user(
            self.dtable, self.admin.username).permission == 'r'

    def test_can_put_group_share(self):
        self.login_as(self.user)

        data = {
            'email': self.admin.username,
            'permission': 'r',
        }
        resp = self.client.put(self.url2, json.dumps(data), 'application/json')
        self.assertEqual(200, resp.status_code)

        assert DTableShare.objects.get_by_dtable_and_to_user(
            self.group_dtable, self.admin.username
        ).permission == 'r'

    def test_can_not_put_with_not_shared(self):
        assert len(DTableShare.objects.all()) == 2
        DTableShare.objects.all().delete()
        assert len(DTableShare.objects.all()) == 0

        self.login_as(self.user)

        data = {
            'email': self.admin.username,
            'permission': 'r',
        }
        resp = self.client.put(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_can_not_put_with_same_permission(self):
        self.login_as(self.user)

        data = {
            'email': self.admin.username,
            'permission': 'rw',
        }
        resp = self.client.put(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

    def test_can_not_put_with_share_to_owner(self):
        self.login_as(self.user)

        data = {
            'email': self.user.username,
            'permission': 'rw',
        }
        resp = self.client.put(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

    def test_can_delete(self):
        assert len(DTableShare.objects.all()) == 2
        self.login_as(self.user)

        data = {
            'email': self.admin.username,
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(200, resp.status_code)
        assert len(DTableShare.objects.all()) == 1

    def test_can_delete_group_share(self):
        assert len(DTableShare.objects.all()) == 2
        self.login_as(self.user)

        data = {
            'email': self.admin.username,
        }
        resp = self.client.delete(self.url2, json.dumps(data), 'application/json')
        self.assertEqual(200, resp.status_code)
        assert len(DTableShare.objects.all()) == 1

    def test_can_delete_with_share_user(self):
        self.login_as(self.admin)

        data = {
            'email': self.admin.username,
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(200, resp.status_code)
        assert len(DTableShare.objects.all()) == 1

    def test_can_not_delete_with_not_shared(self):
        assert len(DTableShare.objects.all()) == 2
        DTableShare.objects.all().delete()
        assert len(DTableShare.objects.all()) == 0

        self.login_as(self.user)

        data = {
            'email': self.admin.username,
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_can_not_delete_with_not_shared_user(self):
        tmp_user = self.create_user(
            'user_%s@test.com' % randstring(4), is_staff=False)

        self.login_as(tmp_user)

        data = {
            'email': self.admin.username,
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

        self.remove_user(tmp_user.username)
