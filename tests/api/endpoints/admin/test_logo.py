import os
from tests.api.apitestbase import ApiTestBase
from tests.common.utils import urljoin
from tests.common.common import BASE_URL
from django.core.urlresolvers import reverse

from seahub.settings import MEDIA_ROOT
from seahub.api2.endpoints.admin.logo import CUSTOM_LOGO_PATH

class AdminLogoTest(ApiTestBase):

    def test_update_logo(self):

        custom_symlink = os.path.join(MEDIA_ROOT, os.path.dirname(CUSTOM_LOGO_PATH))
        if os.path.exists(custom_symlink):
            os.remove(custom_symlink)

        assert not os.path.exists(custom_symlink)

        # update user avatar
        logo_url = reverse('api-v2.1-admin-logo')
        logo_url = urljoin(BASE_URL, logo_url)
        logo_file = os.path.join(os.getcwd(), 'media/img/seafile-logo.png')

        with open(logo_file) as f:
            json_resp = self.admin_post(logo_url, files={'logo': f}).json()

        assert json_resp['success'] == True
        assert os.path.exists(custom_symlink)
        assert os.path.islink(custom_symlink)

    def test_update_logo_with_invalid_user_permission(self):

        # update user avatar
        logo_url = reverse('api-v2.1-admin-logo')
        logo_url = urljoin(BASE_URL, logo_url)
        logo_file = os.path.join(os.getcwd(), 'media/img/seafile-logo.png')

        with open(logo_file) as f:
            json_resp = self.post(logo_url, files={'logo': f}, expected=403).json()
