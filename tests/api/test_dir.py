import json
import os
import time

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.profile.models import Profile
from seahub.base.templatetags.seahub_tags import email2nickname

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
                Profile.objects.get_contact_email_by_user(self.user.username)

    def test_performance_modifier(self):
        for i in range(1000):
            self.text = self.create_file(repo_id=self.repo.id,
                                        parent_dir='/',
                                        filename='test.az'+str(i),
                                        username=self.user.username)
        start_time = time.clock()
        resp = self.client.get(self.endpoint)
        json_resp = json.loads(resp.content)
        end_time = time.clock()
        print ''
        print 'all time:' + str(end_time-start_time)
        print 'number of all file :' + str(len(json_resp))
