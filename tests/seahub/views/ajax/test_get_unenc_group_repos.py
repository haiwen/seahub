import json

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

class GetDirentsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.url = reverse('get_group_repos', args=[self.group.id])

    def test_can_get(self):
        resp = self.client.get(self.url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0
