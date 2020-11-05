from django.urls import reverse

from seahub.test_utils import BaseTestCase

class RepoHistoryTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def test_passwd_true(self):
        resp = self.client.get(reverse('repo_history', args=[self.enc_repo.id]))

        self.assertEqual(302, resp.status_code)
        assert '/library/%(repo_id)s/%(repo_name)s/%(path)s' % {
                'repo_id': self.enc_repo.id, 'repo_name': self.enc_repo.name, 'path': ''} in resp.url
