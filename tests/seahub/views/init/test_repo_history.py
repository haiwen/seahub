from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

class RepoHistoryTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def test_can_render(self):
        resp = self.client.get(reverse('repo_history', args=[self.repo.id]))

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'repo_history.html')
        assert len(resp.context['commits']) == 1

    def test_passwd_true(self):
        resp = self.client.get(reverse('repo_history', args=[self.enc_repo.id]))

        self.assertEqual(302, resp.status_code)
        assert '/library/%(repo_id)s/%(repo_name)s/%(path)s' % {
                'repo_id': self.enc_repo.id, 'repo_name': self.enc_repo.name, 'path': ''} in resp.url
