import json
import os
import time

from django.core.urlresolvers import reverse
from django.core.cache import cache

from seahub.test_utils import BaseTestCase
from seahub.profile.models import Profile
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.utils import normalize_cache_key

class DirTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('DirView', args=[self.repo.id])
        self.folder_name = os.path.basename(self.folder)
        self.file_name = os.path.basename(self.file)

    def tearDown(self):
        self.remove_repo()

    def test_can_list(self):
        resp = self.client.get(self.endpoint)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert len(json_resp) == 2
        assert self.folder_name == json_resp[0]['name']
        assert self.file_name == json_resp[1]['name']
        assert len(json_resp[1]['modifier_name']) > 0
        assert len(json_resp[1]['modifier_contact_email']) > 0

    def test_can_create(self):
        resp = self.client.post(self.endpoint + '?p=/new_dir', {
            'operation': 'mkdir'
        })

        self.assertEqual(201, resp.status_code)

    def test_create_with_nonexistent_parent(self):
        resp = self.client.post(self.endpoint + '?p=/new_parent/new_dir', {
            'operation': 'mkdir'
        })

        self.assertEqual(404, resp.status_code)

    def test_get_dir_file_modifier(self):
        # upload the file , then test whether can get modifier
        self.login_as(self.user)
        self.text = self.create_file(repo_id=self.repo.id,
                                    parent_dir='/',
                                    filename='test.az',
                                    username=self.user.username)

        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp[1]['type'] == 'file'
        assert json_resp[1]['modifier_email'] == self.user.username
        assert json_resp[1]['modifier_name'] == \
                email2nickname(self.user.username)
        assert json_resp[1]['modifier_contact_email'] == \
                email2contact_email(self.user.username)

        p = Profile.objects.add_or_update(self.user.username,
                'test')
        p = Profile.objects.update_contact_email(self.user.username, self.user.username)
        assert cache.get(normalize_cache_key(self.user.username, 'CONTACT_')) == \
                self.user.username
