import os
import json
from tests.common.utils import urljoin
from tests.common.common import BASE_URL
from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.utils import PREVIEW_FILEEXT, get_service_url
from seahub.utils.file_types import IMAGE
from seahub.utils.error_msg import file_type_error_msg
from seahub.settings import MEDIA_ROOT, CUSTOM_FAVICON_PATH, MEDIA_URL

class AdminFaviconTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_post_admin_permission_denied(self):
        self.logout()
        self.login_as(self.admin_cannot_config_system)
        resp = self.client.post(reverse('api-v2.1-admin-favicon'))
        self.assertEqual(403, resp.status_code)

    def test_update_favicon(self):

        custom_symlink = os.path.join(MEDIA_ROOT, os.path.dirname(CUSTOM_FAVICON_PATH))
        if os.path.exists(custom_symlink):
            os.remove(custom_symlink)

        assert not os.path.exists(custom_symlink)

        # update user avatar
        logo_url = reverse('api-v2.1-admin-favicon')
        logo_url = urljoin(BASE_URL, logo_url)
        logo_file = os.path.join(os.getcwd(), 'media/img/seafile-logo.png')

        with open(logo_file, 'rb') as f:
            resp = self.client.post(logo_url, {'favicon': f})

        assert resp.status_code == 200
        json_resp = json.loads(resp.content)
        assert json_resp['favicon_path'] == get_service_url() + MEDIA_URL + CUSTOM_FAVICON_PATH
        assert os.path.exists(custom_symlink)
        assert os.path.islink(custom_symlink)

    def test_update_favicon_with_invalid_user_permission(self):
        self.logout()
        self.login_as(self.user)

        # update user avatar
        logo_url = reverse('api-v2.1-admin-favicon')
        logo_url = urljoin(BASE_URL, logo_url)
        logo_file = os.path.join(os.getcwd(), 'media/img/seafile-logo.png')

        with open(logo_file, 'rb') as f:
            resp = self.client.post(logo_url, {'favicon': f})
        assert resp.status_code == 403

    def test_update_favicon_with_invalid_filetype(self):
        with open('test.noico', 'w') as f:
            f.write('hello')

        logo_url = reverse('api-v2.1-admin-favicon')
        logo_url = urljoin(BASE_URL, logo_url)
        logo_file = os.path.join(os.getcwd(), 'test.noico')

        with open(logo_file, 'rb') as f:
            resp = self.client.post(logo_url, {'favicon': f})
        json_resp = json.loads(resp.content)
        assert resp.status_code == 400
        assert json_resp['error_msg'] == file_type_error_msg('noico', PREVIEW_FILEEXT.get(IMAGE))
