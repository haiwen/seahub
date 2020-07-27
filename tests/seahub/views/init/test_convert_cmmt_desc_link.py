from django.urls import reverse

from seahub.test_utils import BaseTestCase

class ConvertCmmtDescLinkTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def test_can_render(self):
        pass
        # resp = self.client.get(reverse('convert_cmmt_desc_link') + '?repo_id=' + self.repo.id + '&cmmt_id=xxx' + '&nm=foo')

        # self.assertEqual(200, resp.status_code)
