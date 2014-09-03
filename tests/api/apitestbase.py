import requests
import re
import unittest
from nose.tools import assert_equal # pylint: disable=E0611

from common.common import BASE_URL, USERNAME, PASSWORD, IS_PRO
from common.utils import apiurl

BASE_URL = BASE_URL
PING_URL = apiurl('/api2/ping/')
TOKEN_URL = apiurl('/api2/auth-token/')
AUTH_PING_URL = BASE_URL + u'/api2/auth/ping/'

ACCOUNTS_URL = BASE_URL + u'/api2/accounts/'
ACCOUNT_INFO_URL = BASE_URL + u'/api2/account/info/'
USERMSGS_URL = BASE_URL + u'/api2/user/msgs/' + USERNAME + u'/'
USERMSGS_COUNT_URL = BASE_URL + u'/api2/unseen_messages/'
GROUP_URL = BASE_URL + u'/api2/group/'
GROUPS_URL = BASE_URL + u'/api2/groups/'
GROUPMSGS_URL = BASE_URL + u'/api2/group/msgs/'
GROUPMSGS_NREPLY_URL = BASE_URL + u'/api2/new_replies/'
AVATAR_BASE_URL = BASE_URL + u'/api2/avatars/'

DEFAULT_LIBRARY_URL = BASE_URL + u'/api2/default-repo/'
LIBRARIES_URL = BASE_URL + u'/api2/repos/'
VIRTUAL_LIBRARIES_URL = BASE_URL + u'/api2/virtual-repos/'
STARREDFILES_URL = BASE_URL + u'/api2/starredfiles/'
SHARED_LINKS_URL = BASE_URL + u'/api2/shared-links/'
SHARED_LIBRARIES_URL = BASE_URL + u'/api2/shared-repos/'
BESHARED_LIBRARIES_URL = BASE_URL + u'/api2/beshared-repos/'
SHARED_FILES_URL = BASE_URL + u'/api2/shared-files/'
F_URL = BASE_URL + u'/api2/f/'
S_F_URL = BASE_URL + u'/api2/s/f/'

MISC_SEARCH_URL = BASE_URL + u'/api2/search/'
MISC_LIST_GROUP_AND_CONTACTS_URL = BASE_URL + u'/api2/groupandcontacts/'
MISC_LIST_EVENTS_URL = BASE_URL + u'/api2/events/'

class ApiTestCase(unittest.TestCase):
    _token = None

    def get(self, *args, **kwargs):
        self._req('GET', *args, **kwargs)

    def post(self, *args, **kwargs):
        self._req('POST', *args, **kwargs)

    def put(self, *args, **kwargs):
        self._req('PUT', *args, **kwargs)

    def delete(self, *args, **kwargs):
        self._req('DELETE', *args, **kwargs)

    def _req(self, method, *args, **kwargs):
        if self._token is None:
            self._token = get_auth_token()

        headers = kwargs.pop('headers', {})
        headers.setdefault('Authorization', 'Token ' + self._token)
        kwargs['headers'] = headers

        resp = requests.request(method, *args, **kwargs)
        expected = kwargs.pop('expected', 200)
        if expected is not None:
            if hasattr(expected, '__iter__'):
                self.assertIn(resp.status_code, expected,
                    "Expected http status in %s, received %s" % (expected,
                        resp.status_code))
            else:
                self.assertEqual(resp.status_code, expected,
                    "Expected http status %s, received %s" % (expected,
                        resp.status_code))
        return resp

def get_auth_token():
    res = requests.post(TOKEN_URL,
        data=dict(username=USERNAME, password=PASSWORD))
    assert_equal(res.status_code, 200)
    token = res.json()['token']
    assert_equal(len(token), 40)
    return token
