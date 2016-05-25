import json

from django.core.urlresolvers import reverse

from seahub.base.models import FileComment
from seahub.test_utils import BaseTestCase

class FileCommentsTest(BaseTestCase):
    def setUp(self):
        self.tmp_user = self.create_user()

        self.login_as(self.user)
        self.endpoint = reverse('api2-file-comments', args=[self.repo.id]) + '?p=' + self.file

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.tmp_user.email)

    def test_can_list(self):
        o = FileComment.objects.add_by_file_path(repo_id=self.repo.id,
                                                 file_path=self.file,
                                                 author=self.tmp_user.username,
                                                 comment='test comment')
        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['comments']) == 1
        assert json_resp['comments'][0]['comment'] == o.comment
        assert json_resp['comments'][0]['user_email'] == self.tmp_user.email
        assert 'avatars' in json_resp['comments'][0]['avatar_url']

    def test_can_list_with_avatar_size(self):
        o = FileComment.objects.add_by_file_path(repo_id=self.repo.id,
                                                 file_path=self.file,
                                                 author=self.tmp_user.username,
                                                 comment='test comment')
        resp = self.client.get(self.endpoint + '&avatar_size=20')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['comments']) == 1
        assert json_resp['comments'][0]['comment'] == o.comment
        assert json_resp['comments'][0]['user_email'] == self.tmp_user.email
        assert 'avatars' in json_resp['comments'][0]['avatar_url']

    def test_can_post(self):
        resp = self.client.post(self.endpoint, {
            'comment': 'new comment'
        })
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['comment'] == 'new comment'
        assert 'avatars' in json_resp['avatar_url']

    def test_can_post_with_avatar_size(self):
        resp = self.client.post(self.endpoint + '&avatar_size=20', {
            'comment': 'new comment'
        })
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['comment'] == 'new comment'
        assert 'avatars' in json_resp['avatar_url']

    def test_invalid_user(self):
        self.logout()
        self.login_as(self.admin)

        resp = self.client.get(self.endpoint)
        self.assertEqual(403, resp.status_code)

        resp = self.client.post(self.endpoint, {
            'comment': 'new comment'
        })
        self.assertEqual(403, resp.status_code)
