import json
import os

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

class DirTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('DirView', args=[self.repo.id])
        self.folder_name = os.path.basename(self.folder)

    def tearDown(self):
        self.remove_repo()

    def test_can_list(self):
        resp = self.client.get(self.endpoint)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert len(json_resp) == 1
        assert self.folder_name == json_resp[0]['name']

    def test_can_create(self):
        resp = self.client.post(self.endpoint + '?p=/new_dir', {
            'operation': 'mkdir'
        })

        self.assertEqual(201, resp.status_code)

    def test_create_with_nonexistent_parent(self):
        resp = self.client.post(self.endpoint + '?p=/new_parent/new_dir', {
            'operation': 'mkdir'
        })

        self.assertEqual(400, resp.status_code)
