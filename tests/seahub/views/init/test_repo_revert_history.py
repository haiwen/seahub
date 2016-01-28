from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

class RepoRevertHistoryTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def test_bad_commit_id(self):
        resp = self.client.post(reverse('repo_revert_history', args=[self.repo.id])  + '?commit_id=xxx', {

        })
        self.assertEqual(200, resp.status_code)
        assert 'Invalid arguments' in resp.content
