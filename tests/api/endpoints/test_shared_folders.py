import os
import json

from django.urls import reverse

from seaserv import seafile_api

from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

class SharedFoldersTest(BaseTestCase):

    def create_virtual_repo(self):

        name = os.path.basename(self.folder.rstrip('/'))
        sub_repo_id = seafile_api.create_virtual_repo(
                self.repo.id, self.folder, name,
                name, self.user.username)
        return sub_repo_id

    def share_repo_to_user(self, repo_id):
        seafile_api.share_repo(
                repo_id, self.user.username,
                self.admin.username, 'rw')

    def share_repo_to_group(self, repo_id):
        seafile_api.set_group_repo(
                repo_id, self.group.id,
                self.user.username, 'rw')

    def setUp(self):
        self.repo_id = self.repo.id
        self.group_id = self.group.id
        self.user_name = self.user.username
        self.admin_user = self.admin.username
        self.url = reverse('api-v2.1-shared-folders')

        self.sub_repo_id = self.create_virtual_repo()

    def tearDown(self):
        seafile_api.remove_share(self.repo_id, self.user_name, self.admin_user)
        seafile_api.unset_group_repo(self.repo_id, self.group_id, self.user_name)
        seafile_api.remove_inner_pub_repo(self.repo_id)

        self.remove_repo()

    def test_can_get_when_share_to_user(self):
        self.share_repo_to_user(self.sub_repo_id)

        contact_email = '%s@%s.com' % (randstring(6), randstring(6))
        nickname = randstring(6)
        p = Profile.objects.add_or_update(self.admin.username, nickname=nickname)
        p.contact_email = contact_email
        p.save()

        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['share_type'] == 'personal'
        assert json_resp[0]['repo_id'] == self.repo_id
        assert json_resp[0]['user_email'] == self.admin.username
        assert json_resp[0]['user_name'] == nickname
        assert json_resp[0]['contact_email'] == contact_email

    def test_can_get_when_share_to_group(self):

        self.share_repo_to_group(self.sub_repo_id)

        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['share_type'] == 'group'
        assert json_resp[0]['repo_id'] == self.repo_id
        assert json_resp[0]['group_id'] == self.group_id

    def test_get_with_invalid_repo_permission(self):
        # login with admin, then get user's share repo info
        self.login_as(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0
