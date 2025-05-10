import unittest

from tests.api.apitestbase import ApiTestBase
from tests.api.urls import AVATAR_BASE_URL, GROUPS_URL
from tests.common.utils import randstring, apiurl, urljoin

class AvatarApiTest(ApiTestBase):
    def test_user_avatar(self):
        avatar_url = urljoin(AVATAR_BASE_URL, 'user', self.username, '/resized/80/')
        info = self.get(avatar_url).json()
        self.assertIsNotNone(info['url'])
        self.assertIsNotNone(info['is_default'])
        self.assertIsNotNone(info['mtime'])
