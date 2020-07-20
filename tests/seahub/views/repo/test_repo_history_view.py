from django.urls import reverse

from seahub.test_utils import BaseTestCase

class RepoHistoryViewTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.url = reverse('repo_history_view', args=[self.repo.id]) + '?commit_id=' + self.repo.head_cmmt_id

    def test_can_render(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'repo_history_view.html')
        assert resp.context['user_perm'] == 'rw'
