import os
import random
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import AVATAR_BASE_URL
from tests.common.utils import urljoin
from tests.common.common import BASE_URL
from django.urls import reverse

class AvatarApiTest(ApiTestBase):

    def test_create_user_avatar(self):

        # update user avatar
        avatar_url = reverse('api-v2.1-user-avatar')
        avatar_url = urljoin(BASE_URL, avatar_url)
        avatar_file = os.path.join(os.getcwd(), 'media/img/seafile-logo.png')

        random_avatar_size = 256

        with open(avatar_file, 'rb') as f:
            json_resp = self.post(avatar_url, files={'avatar': f}, data={'avatar_size': 256}).json()

        assert 'avatar_url' in json_resp
        response_url = json_resp['avatar_url']
        list_url = response_url.split('/')
        assert str(random_avatar_size) in list_url

