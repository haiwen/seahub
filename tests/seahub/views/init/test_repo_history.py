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
