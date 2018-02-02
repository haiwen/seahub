import os
import json
from tests.common.utils import urljoin
from tests.common.common import BASE_URL
from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.settings import MEDIA_ROOT, CUSTOM_LOGO_PATH
from seahub.utils.file_types import IMAGE
from seahub.utils import PREVIEW_FILEEXT
from seahub.utils.error_msg import file_type_error_msg


class AdminLogoTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_update_logo(self):

        custom_symlink = os.path.join(MEDIA_ROOT, os.path.dirname(CUSTOM_LOGO_PATH))
        if os.path.exists(custom_symlink):
            os.remove(custom_symlink)

        assert not os.path.exists(custom_symlink)

        # update user avatar
        image_url = reverse('api-v2.1-admin-login-background-image')
        image_url = urljoin(BASE_URL, image_url)
        image_file = os.path.join(os.getcwd(), 'media/img/seafile-logo.png')

        with open(image_file, 'rb') as f:
            resp = self.client.post(image_url, {'login_bg_image': f})
        json_resp = json.loads(resp.content)

        assert 200 == resp.status_code
        assert json_resp['success'] == True
        assert os.path.exists(custom_symlink)
        assert os.path.islink(custom_symlink)

    def test_update_logo_with_invalid_user_permission(self):
        self.logout()

        # update user avatar
        image_url = reverse('api-v2.1-admin-login-background-image')
        image_url = urljoin(BASE_URL, image_url)
        image_file = os.path.join(os.getcwd(), 'media/img/seafile-logo.png')

        with open(image_file, 'rb') as f:
            resp = self.client.post(image_url, {'login_bg_image': f})

        assert 403 == resp.status_code

    def test_update_logo_with_invalid_file_type(self):
        with open('test.noimage', 'w') as f:
            f.write('hello')

        image_url = reverse('api-v2.1-admin-login-background-image')
        image_url = urljoin(BASE_URL, image_url)
        image_file = os.path.join(os.getcwd(), 'test.noimage')

        with open(image_file, 'rb') as f:
            resp = self.client.post(image_url, {'login_bg_image': f})

            json_resp = json.loads(resp.content)

        os.remove(image_file)
        assert 400 == resp.status_code
        assert json_resp['error_msg'] == file_type_error_msg("noimage", PREVIEW_FILEEXT.get('Image'))
