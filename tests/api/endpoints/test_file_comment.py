import json

from django.core.urlresolvers import reverse

from seahub.base.models import FileComment
from seahub.test_utils import BaseTestCase

class FileCommentTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

        o = FileComment.objects.add_by_file_path(repo_id=self.repo.id,
                                                 file_path=self.file,
                                                 author=self.user.username,
                                                 comment='test comment')
        self.endpoint = reverse('api2-file-comment', args=[self.repo.id, o.pk]) + '?p=' + self.file

    def tearDown(self):
        self.remove_repo()

    def test_can_get(self):
        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['parent_path'] == '/'
        assert json_resp['item_name'] == 'test.txt'

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
