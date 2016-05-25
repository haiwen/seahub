import json

from django.core.urlresolvers import reverse

from seahub.base.models import FileComment
from seahub.test_utils import BaseTestCase

class FileCommentTest(BaseTestCase):
    def setUp(self):
        self.tmp_user = self.create_user()
        o = FileComment.objects.add_by_file_path(repo_id=self.repo.id,
                                                 file_path=self.file,
                                                 author=self.tmp_user.username,
                                                 comment='test comment')
        self.login_as(self.user)

        self.endpoint = reverse('api2-file-comment', args=[self.repo.id, o.pk]) + '?p=' + self.file

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.tmp_user.email)

    def test_can_get(self):
        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['parent_path'] == '/'
        assert json_resp['item_name'] == 'test.txt'
        assert json_resp['user_email'] == self.tmp_user.email
        assert 'avatars' in json_resp['avatar_url']

    def test_can_get_with_avatar_size(self):
        resp = self.client.get(self.endpoint + '&avatar_size=20')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['parent_path'] == '/'
        assert json_resp['item_name'] == 'test.txt'
        assert json_resp['user_email'] == self.tmp_user.email
        assert 'avatars' in json_resp['avatar_url']

    def test_can_delete(self):
        assert len(FileComment.objects.all()) == 1
        resp = self.client.delete(self.endpoint)
        self.assertEqual(204, resp.status_code)
        assert len(FileComment.objects.all()) == 0

    def test_invalid_user_can_not_delete(self):
        self.logout()
        self.login_as(self.admin)

        assert len(FileComment.objects.all()) == 1
        resp = self.client.delete(self.endpoint)
        self.assertEqual(403, resp.status_code)
        assert len(FileComment.objects.all()) == 1
