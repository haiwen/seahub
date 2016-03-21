import json

from django.core.urlresolvers import reverse
from seahub.test_utils import BaseTestCase

class AccountTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def tearDown(self):
        self.remove_repo()

    def test_get_sysinfo(self):

        url = reverse('api-v2.1-sysinfo')
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)

        assert len(json_resp) == 9
        assert json_resp['is_pro'] == False
        assert json_resp['multi_tenancy_enabled'] == False
