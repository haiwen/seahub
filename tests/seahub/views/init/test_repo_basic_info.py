from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

class RepoBasicInfoTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def test_can_render(self):
        resp = self.client.get(reverse('repo_basic_info', args=[self.repo.id]))

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'repo_basic_info.html')
        assert resp.context['history_limit'] == ''
