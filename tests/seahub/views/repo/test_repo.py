from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

class RepoTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.url = reverse('repo', args=[self.repo.id])

    def test_can_render(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'repo.html')
        assert resp.context['user_perm'] == 'rw'
