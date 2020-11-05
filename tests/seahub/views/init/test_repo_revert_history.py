from django.urls import reverse

from seahub.test_utils import BaseTestCase

class RepoRevertHistoryTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def test_bad_commit_id(self):
        resp = self.client.post(reverse('repo_revert_history', args=[self.repo.id])  + '?commit_id=xxx', {

        })
        self.assertEqual(200, resp.status_code)
        assert b'Invalid arguments' in resp.content

    def test_passwd_true(self):
        resp = self.client.post(reverse('repo_revert_history', args=[self.enc_repo.id]) + '?commit_id=xxx', {})

        self.assertEqual(302, resp.status_code)
        assert '/library/%(repo_id)s/%(repo_name)s/%(path)s' % {
                'repo_id': self.enc_repo.id, 'repo_name': self.enc_repo.name, 'path': ''} in resp.url
