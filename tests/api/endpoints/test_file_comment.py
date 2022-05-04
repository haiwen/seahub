import json

from django.urls import reverse

from seahub.base.models import FileComment
from seahub.test_utils import BaseTestCase

class FileCommentTest(BaseTestCase):
    def setUp(self):
        self.tmp_user = self.create_user()

        self.tmp_repo_1_id = self.create_repo(
            name='tmp-repo-1', desc='', username=self.tmp_user.username, passwd=None)
        self.file1 = self.create_file(repo_id=self.tmp_repo_1_id, parent_dir='/',
                                      filename='test1.txt',
                                      username=self.tmp_user.username)

        self.tmp_repo_2_id = self.create_repo(
            name='tmp-repo-2', desc='', username=self.user.username, passwd=None)
        self.file2 = self.create_file(repo_id=self.tmp_repo_2_id, parent_dir='/',
                                      filename='test2.txt',
                                      username=self.user.username)

        o = FileComment.objects.add_by_file_path(repo_id=self.repo.id,
                                                 file_path=self.file,
                                                 author=self.tmp_user.username,
                                                 comment='test comment')
        o1 = FileComment.objects.add_by_file_path(repo_id=self.tmp_repo_1_id,
                                                  file_path='/test1.txt',
                                                  author=self.tmp_user.username,
                                                  comment='test comment1')
        o2 = FileComment.objects.add_by_file_path(repo_id=self.tmp_repo_2_id,
                                                  file_path='/test2.txt',
                                                  author=self.user.username,
                                                  comment='test comment2')
        self.login_as(self.user)

        self.endpoint = reverse('api2-file-comment', args=[self.repo.id, o.pk]) + '?p=' + self.file
        self.endpoint1 = reverse('api2-file-comment', args=[self.repo.id, o1.pk]) + '?p=' + '/test1.txt'
        self.endpoint2 = reverse('api2-file-comment', args=[self.repo.id, o2.pk]) + '?p=' + '/test2.txt'

    def tearDown(self):
        self.remove_repo()
        self.remove_repo(repo_id=self.tmp_repo_1_id)
        self.remove_repo(repo_id=self.tmp_repo_2_id)
        self.remove_user()
        self.remove_user(self.tmp_user.email)
        FileComment.objects.all().delete()

    def test_can_get(self):
        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['repo_id'] == self.repo.id
        assert json_resp['parent_path'] == '/'
        assert json_resp['item_name'] == 'test.txt'
        assert json_resp['user_email'] == self.tmp_user.email
        assert 'avatars' in json_resp['avatar_url']

    def test_can_not_get_other_repo_file_comment(self):
        resp = self.client.get(self.endpoint1)
        self.assertEqual(404, resp.status_code)

    def test_can_not_get_other_user_file_comment(self):
        resp = self.client.get(self.endpoint2)
        self.assertEqual(404, resp.status_code)

    def test_can_get_with_avatar_size(self):
        resp = self.client.get(self.endpoint + '&avatar_size=20')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['parent_path'] == '/'
        assert json_resp['item_name'] == 'test.txt'
        assert json_resp['user_email'] == self.tmp_user.email
        assert 'avatars' in json_resp['avatar_url']

    def test_can_delete(self):
        assert len(FileComment.objects.all()) == 3
        resp = self.client.delete(self.endpoint)
        self.assertEqual(204, resp.status_code)
        assert len(FileComment.objects.all()) == 2

    def test_can_not_delete_other_repo_file_comment(self):
        assert len(FileComment.objects.all()) == 3
        resp = self.client.delete(self.endpoint1)
        self.assertEqual(404, resp.status_code)
        assert len(FileComment.objects.all()) == 3

    def test_can_not_delete_other_user_file_comment(self):
        assert len(FileComment.objects.all()) == 3
        resp = self.client.delete(self.endpoint2)
        self.assertEqual(404, resp.status_code)
        assert len(FileComment.objects.all()) == 3

    def test_invalid_user_can_not_delete(self):
        self.logout()
        self.login_as(self.admin)

        assert len(FileComment.objects.all()) == 3
        resp = self.client.delete(self.endpoint)
        self.assertEqual(403, resp.status_code)
        assert len(FileComment.objects.all()) == 3
