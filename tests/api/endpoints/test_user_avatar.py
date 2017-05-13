import os
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import AVATAR_BASE_URL
from tests.common.utils import urljoin
from tests.common.common import BASE_URL
from django.core.urlresolvers import reverse

class AvatarApiTest(ApiTestBase):

    def test_create_user_avatar(self):

        # update user avatar
        avatar_url = reverse('api-v2.1-user-avatar')
        avatar_url = urljoin(BASE_URL, avatar_url)
        avatar_file = os.path.join(os.getcwd(), 'media/img/seafile-logo.png')

        with open(avatar_file) as f:
            json_resp = self.post(avatar_url, files={'avatar': f}).json()

        assert json_resp['success'] == True

        # assert is NOT default avatar
        avatar_url = urljoin(AVATAR_BASE_URL, 'user', self.username, '/resized/80/')
        info = self.get(avatar_url).json()
        assert 'resized' in info['url']
        assert info['is_default'] == False
