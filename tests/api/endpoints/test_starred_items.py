import json
from tests.common.utils import randstring

from django.urls import reverse

from seahub.base.models import UserStarredFiles
from seahub.utils.star import is_file_starred
from seahub.utils import normalize_dir_path
from seahub.test_utils import BaseTestCase

class StarredItemsTest(BaseTestCase):

    def setUp(self):
        all_starred_items = UserStarredFiles.objects.all()
        all_starred_items.delete()

        self.repo_id = self.repo.id
        self.user_name = self.user.username
        self.folder_path =  normalize_dir_path(self.folder)
        self.url = reverse('api-v2.1-starred-items')

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def test_can_get(self):
        self.login_as(self.user)

        # star a file
        data = {'repo_id': self.repo_id, 'path': self.file}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        # star a folder
        data = {'repo_id': self.repo_id, 'path': self.folder_path}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        # get all starred items
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert len(json_resp['starred_item_list']) == 2

    def test_can_star_file(self):
        self.login_as(self.user)
        data = {
            'repo_id': self.repo_id,
            'path': self.file,
        }

        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        assert is_file_starred(self.user_name, self.repo_id, self.file) is True

    def test_can_star_folder(self):
        self.login_as(self.user)
        data = {
            'repo_id': self.repo_id,
            'path': self.folder_path,
        }

        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        assert is_file_starred(self.user_name, self.repo_id, self.folder_path) is True

    def test_can_unstar_file(self):
        self.login_as(self.user)

        # first star a file
        data = {'repo_id': self.repo_id, 'path': self.file}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        # confirm file is starred
        assert is_file_starred(self.user_name, self.repo_id, self.file) is True

        # then unstar a file
        resp = self.client.delete(self.url + '?repo_id=%s&path=%s' % (self.repo_id, self.file))
        self.assertEqual(200, resp.status_code)

        # confirm file is unstarred
        assert is_file_starred(self.user_name, self.repo_id, self.file) is False

    def test_can_not_unstar_file_when_path_is_wrong(self):
        self.login_as(self.user)

        # first star a file
        data = {'repo_id': self.repo_id, 'path': self.file}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        # confirm file is starred
        assert is_file_starred(self.user_name, self.repo_id, self.file) is True

        # can not unstar a file when path is wrong
        resp = self.client.delete(self.url + '?repo_id=%s&path=%s' % (self.repo_id, self.file[:2] + randstring(5) + self.file[2:]))
        self.assertEqual(404, resp.status_code)

        # confirm file is starred
        assert is_file_starred(self.user_name, self.repo_id, self.file) is True

    def test_can_unstar_folder(self):
        self.login_as(self.user)

        # first star a folder
        data = {'repo_id': self.repo_id, 'path': self.folder_path}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        # confirm folder is starred
        assert is_file_starred(self.user_name, self.repo_id, self.folder_path) is True

        # then unstar a folder
        resp = self.client.delete(self.url + '?repo_id=%s&path=%s' % (self.repo_id, self.folder_path))
        self.assertEqual(200, resp.status_code)

        # confirm folder is unstarred
        assert is_file_starred(self.user_name, self.repo_id, self.folder_path) is False

    def test_can_not_unstar_folder_when_path_is_wrong(self):
        self.login_as(self.user)

        # first star a folder
        data = {'repo_id': self.repo_id, 'path': self.folder_path}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        # confirm folder is starred
        assert is_file_starred(self.user_name, self.repo_id, self.folder_path) is True

        # can not unstar a folder when path is wrong
        resp = self.client.delete(self.url + '?repo_id=%s&path=%s' % (self.repo_id, self.folder_path[:2] + randstring(5) + self.folder_path[2:]))
        self.assertEqual(404, resp.status_code)

        # confirm folder is starred
        assert is_file_starred(self.user_name, self.repo_id, self.folder_path) is True
