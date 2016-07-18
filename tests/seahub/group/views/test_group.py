from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase


class GroupDiscussTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def tearDown(self):
        self.remove_group()

    def test_can_render(self):
        resp = self.client.get(reverse('group_discuss', args=[self.group.id]))
        self.assertEqual(200, resp.status_code)
