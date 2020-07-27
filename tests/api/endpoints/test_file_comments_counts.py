import json

from django.urls import reverse

from seahub.base.models import FileComment
from seahub.test_utils import BaseTestCase

class FileCommentsCountsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('api2-file-comments-counts', args=[self.repo.id]) + '?p=/'

        self.file2 = self.create_file(repo_id=self.repo.id, parent_dir='/',
                                      filename='test2.txt',
                                      username=self.user.username)

    def tearDown(self):
        self.remove_repo()

    def test_can_get(self):
        FileComment.objects.add_by_file_path(repo_id=self.repo.id,
                                             file_path=self.file,
                                             author=self.user.username,
                                             comment='test comment')

        FileComment.objects.add_by_file_path(repo_id=self.repo.id,
                                             file_path=self.file,
                                             author=self.user.username,
                                             comment='reply test comment')

        FileComment.objects.add_by_file_path(repo_id=self.repo.id,
                                             file_path=self.file2,
                                             author=self.user.username,
                                             comment='test comment on other file')

        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 2
        for d in json_resp:
            if list(d.keys())[0] == 'test.txt':
                assert d['test.txt'] == 2

            if list(d.keys())[0] == 'test2.txt':
                assert d['test2.txt'] == 1

    # def test_can_get_file(self):
    #     FileComment.objects.add_by_file_path(repo_id=self.repo.id,
    #                                          file_path=self.file2,
    #                                          author=self.user.username,
    #                                          comment='test comment on other file')

    #     FileComment.objects.add_by_file_path(repo_id=self.repo.id,
    #                                          file_path=self.file2,
    #                                          author=self.user.username,
    #                                          comment='test comment on other file123')
    #     self.file_request= reverse('api2-file-comments-counts', args=[self.repo.id]) + '?p=' + self.file2 
    #     resp = self.client.get(self.file_request)
    #     self.assertEqual(404, resp.status_code)
