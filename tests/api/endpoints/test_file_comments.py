import json

from django.core.urlresolvers import reverse

from seahub.base.models import FileComment
from seahub.test_utils import BaseTestCase

class FileCommentsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('api2-file-comments', args=[self.repo.id]) + '?p=' + self.file

    def tearDown(self):
        self.remove_repo()

    def test_can_list(self):
        o = FileComment.objects.add_by_file_path(repo_id=self.repo.id,
                                                 file_path=self.file,
                                                 author=self.user.username,
                                                 comment='test comment')
        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['comments']) == 1
        assert json_resp['comments'][0]['comment'] == o.comment

    def test_can_post(self):
        resp = self.client.post(self.endpoint, {
            'comment': 'new comment'
        })
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['comment'] == 'new comment'

    def test_invalid_user(self):
        self.logout()
        self.login_as(self.admin)

        resp = self.client.get(self.endpoint)
        self.assertEqual(403, resp.status_code)

        resp = self.client.post(self.endpoint, {
            'comment': 'new comment'
        })
        self.assertEqual(403, resp.status_code)
