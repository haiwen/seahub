import json

from django.core.urlresolvers import reverse
import seaserv
from seaserv import seafile_api, ccnet_api

from seahub.base.models import FileComment
from seahub.notifications.models import UserNotification
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
        for i in xrange(10):
            o = FileComment.objects.add_by_file_path(repo_id=self.repo.id,
                                                     file_path=self.file,
                                                     author=self.tmp_user.username,
                                                     comment='test comment'+str(i))
        resp = self.client.get(self.endpoint + '&page=2&per_page=5')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(resp._headers.get('links')) == 2
        assert resp._headers.get('links')[0] == 'Links'
        link = reverse('api2-file-comments', args=[self.repo.id]) + '?per_page=5&page=1'
        assert link in resp._headers.get('links')[1]
        assert len(json_resp['comments']) == 5
        assert json_resp['comments'][0]['comment'] == 'test comment5'
        assert json_resp['comments'][0]['user_email'] == self.tmp_user.email
        assert 'avatars' in json_resp['comments'][0]['avatar_url']
        assert json_resp['total_count'] == 10

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
        assert json_resp['total_count'] == 1

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

    def test_can_notify_others(self):
        assert len(UserNotification.objects.all()) == 0

        username = self.user.username
        seafile_api.share_repo(self.repo.id, username,
                               self.admin.username, 'rw')

        resp = self.client.post(self.endpoint, {
            'comment': 'new comment'
        })
        self.assertEqual(201, resp.status_code)

        assert len(UserNotification.objects.all()) == 1
        assert UserNotification.objects.all()[0].to_user == self.admin.username

    def test_can_notify_others_including_group(self):
        self.logout()
        self.login_as(self.tmp_user)

        assert len(UserNotification.objects.all()) == 0

        # share repo to tmp_user
        username = self.user.username
        seafile_api.share_repo(self.repo.id, username,
                               self.tmp_user.username, 'rw')

        # share repo to group(owner, admin)
        ccnet_api.group_add_member(self.group.id, username,
                                   self.admin.username)
        seafile_api.set_group_repo(self.repo.id, self.group.id,
                                   username, 'rw')

        # tmp_user comment a file
        resp = self.client.post(self.endpoint, {
            'comment': 'new comment'
        })
        self.assertEqual(201, resp.status_code)

        assert len(UserNotification.objects.all()) == 2
