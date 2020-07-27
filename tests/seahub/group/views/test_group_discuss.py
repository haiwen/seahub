from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.constants import HASH_URLS


class GroupDiscussTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def tearDown(self):
        self.remove_group()

    def test_can_render(self):
        resp = self.client.get(HASH_URLS['GROUP_DISCUSS']% {'group_id': self.group.id})
        self.assertEqual(200, resp.status_code)
