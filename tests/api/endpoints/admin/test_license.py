import os
import json
from mock import patch
from django.core.urlresolvers import reverse

from seahub.api2.endpoints.admin import license as license_api
from seahub.settings import LICENSE_PATH
from seahub.test_utils import BaseTestCase
from tests.common.utils import urljoin
from tests.common.common import BASE_URL


class AdminLicenseTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    @patch.object(license_api, 'ccnet_api')
    def test_update_license(self, mock_ccnet_api):
        mock_ccnet_api.return_val = {}

        url = reverse('api-v2.1-admin-license')
        url = urljoin(BASE_URL, url)
        with open(
                os.path.join(os.getcwd(), 'tests/seahub/utils/seafile-license.txt')) as f:
            json_resp = self.client.post(url, {'license': f})
        json_resp = json.loads(json_resp.content)

        assert json_resp['success'] is True
        assert os.path.exists(LICENSE_PATH)
