import json


from django.core.urlresolvers import reverse

from seahub.base.models import UserStarredFiles
from seahub.utils.star import is_file_starred
from seahub.test_utils import BaseTestCase

class StarredItemsTest(BaseTestCase):

    def setUp(self):
        all_starred_items = UserStarredFiles.objects.all()
        all_starred_items.delete()

        self.repo_id = self.repo.id
        self.user_name = self.user.username
        self.url = reverse('api-v2.1-starred-items')

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def test_can_get(self):
        self.login_as(self.user)

        # star a file
        data = {'repo_id': self.repo_id, 'path': self.file, 'is_dir': 'false'}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        # star a folder
        data = {'repo_id': self.repo_id, 'path': self.folder, 'is_dir': 'true'}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        # get all starred items
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 2

    def test_can_star_file(self):
        self.login_as(self.user)
        data = {
            'repo_id': self.repo_id,
            'path': self.file,
            'is_dir': 'false',
        }

        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        assert is_file_starred(self.user_name, self.repo_id, self.file) is True

    def test_can_star_folder(self):
        self.login_as(self.user)
        data = {
            'repo_id': self.repo_id,
            'path': self.folder,
            'is_dir': 'true',
        }

        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        assert is_file_starred(self.user_name, self.repo_id, self.folder) is True

    def test_can_unstar_file(self):
        self.login_as(self.user)

        # first star a file
        data = {'repo_id': self.repo_id, 'path': self.file, 'is_dir': 'false'}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        # confirm file is starred
        assert is_file_starred(self.user_name, self.repo_id, self.file) is True

        # then unstar a file
        data = 'repo_id=%s&path=%s&is_dir=false' % (self.repo_id, self.file)
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        # confirm file is unstarred
        assert is_file_starred(self.user_name, self.repo_id, self.file) is False

    def test_can_unstar_folder(self):
        self.login_as(self.user)

        # first star a folder
        data = {'repo_id': self.repo_id, 'path': self.folder, 'is_dir': 'true'}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        # confirm folder is starred
        assert is_file_starred(self.user_name, self.repo_id, self.folder) is True

        # then unstar a folder
        data = 'repo_id=%s&path=%s&is_dir=true' % (self.repo_id, self.folder)
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        # confirm folder is unstarred
        assert is_file_starred(self.user_name, self.repo_id, self.folder) is False
