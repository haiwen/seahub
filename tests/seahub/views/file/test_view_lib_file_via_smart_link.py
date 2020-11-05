import json

from django.urls import reverse

from seahub.test_utils import BaseTestCase


class ViewLibFileViaSmartLinkTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path = self.file
        self.folder_path = self.folder

        self.login_as(self.user)

        # get file smart link
        get_smart_link_url = reverse('api-v2.1-smart-link')
        data = '?repo_id=%s&path=%s&is_dir=false' % (self.repo_id, self.file_path)
        resp = self.client.get(get_smart_link_url + data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['smart_link'] is not None
        assert json_resp['smart_link_token'] is not None

        self.smart_link = json_resp['smart_link']

    def tearDown(self):
        self.remove_repo()

    def test_can_view(self):
        self.login_as(self.user)

        url = self.smart_link
        resp = self.client.get(url)
        self.assertEqual(302, resp.status_code)
        assert 'lib/' in resp.get('location')
        assert '/file/' in resp.get('location')
        assert 'dl=1' not in resp.get('location')

    def test_can_download(self):
        self.login_as(self.user)

        url = self.smart_link + '?dl=1'
        resp = self.client.get(url)
        self.assertEqual(302, resp.status_code)
        assert 'lib/' in resp.get('location')
        assert '/file/' in resp.get('location')
        assert 'dl=1' in resp.get('location')

        resp = self.client.get(resp.get('location'))
        assert '8082/files/' in resp.get('location')
