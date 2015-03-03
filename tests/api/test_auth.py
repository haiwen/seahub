#coding: UTF-8
"""
Test auth related api, such as login/logout.
"""

import random
import re
from urllib import urlencode, quote

from tests.common.common import USERNAME, PASSWORD, SEAFILE_BASE_URL
from tests.common.utils import randstring, urljoin
from tests.api.urls import (
    AUTH_PING_URL, TOKEN_URL, DOWNLOAD_REPO_URL, LOGOUT_DEVICE_URL
)
from tests.api.apitestbase import ApiTestBase

def fake_ccnet_id():
    return randstring(length=40)

class AuthTest(ApiTestBase):
    """This tests involves creating/deleting api tokens, so for this test we use
    a specific auth token so that it won't affect other test cases.
    """
    def test_logout_device(self):
        token = self._desktop_login()
        self._do_auth_ping(token, expected=200)

        with self.get_tmp_repo() as repo:
            sync_token = self._clone_repo(token, repo.repo_id)
            self._get_repo_info(sync_token, repo.repo_id)

            self._logout(token)

            self._do_auth_ping(token, expected=403)
            # self._get_repo_info(sync_token, repo.repo_id, expected=400)

    def _desktop_login(self):
        data = {
            'username': USERNAME,
            'password': PASSWORD,
            'platform': 'windows',
            'device_id': fake_ccnet_id(),
            'device_name': 'fake-device-name',
            'client_version': '4.1.0',
            'platform_version': '',
        }
        return self.post(TOKEN_URL, data=data, use_token=False).json()['token']

    def _do_auth_ping(self, token, **kwargs):
        return self.get(AUTH_PING_URL, token=token, **kwargs)

    def _clone_repo(self, token, repo_id):
        return self.get(DOWNLOAD_REPO_URL % repo_id, token=token).json()['token']

    def _get_repo_info(self, sync_token, repo_id, **kwargs):
        headers = {
            'Seafile-Repo-Token': sync_token
        }
        url = urljoin(SEAFILE_BASE_URL,
                      'repo/%s/permission-check/?op=upload' % repo_id)
        self.get(url, use_token=False, headers=headers, **kwargs)

    def _logout(self, token):
        self.post(LOGOUT_DEVICE_URL, token=token)
