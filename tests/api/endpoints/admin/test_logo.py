import os
import json
from tests.common.utils import urljoin
from tests.common.common import BASE_URL
from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.settings import MEDIA_ROOT, CUSTOM_LOGO_PATH, MEDIA_URL
from seahub.utils import PREVIEW_FILEEXT, get_service_url
from seahub.utils.file_types import IMAGE
from seahub.utils.error_msg import file_type_error_msg


class AdminLogoTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_post_admin_permission_denied(self):
        self.logout()
        self.login_as(self.admin_cannot_config_system)
        resp = self.client.post(reverse('api-v2.1-admin-logo'))
        self.assertEqual(403, resp.status_code)

    def test_update_logo(self):

        custom_symlink = os.path.join(MEDIA_ROOT, os.path.dirname(CUSTOM_LOGO_PATH))
        if os.path.exists(custom_symlink):
            os.remove(custom_symlink)

        assert not os.path.exists(custom_symlink)

        # update user avatar
        logo_url = reverse('api-v2.1-admin-logo')
        logo_url = urljoin(BASE_URL, logo_url)
        logo_file = os.path.join(os.getcwd(), 'media/img/seafile-logo.png')

        with open(logo_file, 'rb') as f:
            resp = self.client.post(logo_url, {'logo': f})
        json_resp = json.loads(resp.content)

        assert 200 == resp.status_code
        assert json_resp['logo_path'] == get_service_url() + MEDIA_URL + CUSTOM_LOGO_PATH
        assert os.path.exists(custom_symlink)
        assert os.path.islink(custom_symlink)

    def test_update_logo_with_invalid_user_permission(self):
        self.logout()

        # update user avatar
        logo_url = reverse('api-v2.1-admin-logo')
        logo_url = urljoin(BASE_URL, logo_url)
        logo_file = os.path.join(os.getcwd(), 'media/img/seafile-logo.png')

        with open(logo_file, 'rb') as f:
            resp = self.client.post(logo_url, {'logo': f})

        assert 403 == resp.status_code


    def test_update_logo_with_invalid_file_type(self):
        with open('test.noimage', 'w') as f:
            f.write('1')

        logo_url = reverse('api-v2.1-admin-logo')
        logo_url = urljoin(BASE_URL, logo_url)
        logo_file = os.path.join(os.getcwd(), 'test.noimage')

        with open(logo_file, 'rb') as f:
            resp = self.client.post(logo_url, {'logo': f})
        json_resp = json.loads(resp.content)

        os.remove(logo_file)
        assert 400 == resp.status_code
        assert json_resp['error_msg'] == file_type_error_msg('noimage', PREVIEW_FILEEXT.get(IMAGE))
