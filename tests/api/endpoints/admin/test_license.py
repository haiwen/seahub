import os
import json
from tests.common.utils import urljoin
from tests.common.common import BASE_URL
from django.core.urlresolvers import reverse

from seahub.settings import LICENSE_PATH
from seahub.test_utils import BaseTestCase

class AdminLicenseTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_update_license(self):

        license_dir = os.path.dirname(LICENSE_PATH)
        if  os.path.exists(LICENSE_PATH):
            os.remove(LICENSE_PATH)
        assert not os.path.exists(LICENSE_PATH)

        url = reverse('api-v2.1-admin-license')
        url = urljoin(BASE_URL, url)
        license_file = os.path.join(os.getcwd(), 'media/hello.hi')
        with open(license_file) as f:
            json_resp = self.client.post(url, {'license': f})
        json_resp = json.loads(json_resp.content)
        assert json_resp['success'] == True
        assert os.path.exists(LICENSE_PATH)
