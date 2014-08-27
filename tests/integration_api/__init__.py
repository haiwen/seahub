# Copyright 2014 seahub authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
from common.common import BASE_URL, USERNAME, PASSWORD
import requests, re

BASE_URL = BASE_URL
PING_URL = BASE_URL + u'/api2/ping/'
TOKEN_URL = BASE_URL + u'/api2/auth-token/'
AUTH_PING_URL = BASE_URL + u'/api2/auth/ping/'

ACCOUNTS_URL = BASE_URL + u'/api2/accounts/'
ACCOUNT_INFO_URL = BASE_URL + u'/api2/account/info/'
USERMSGS_URL = BASE_URL + u'/api2/user/msgs/' + USERNAME + u'/'
USERMSGS_COUNT_URL = BASE_URL + u'/api2/unseen_messages/'
GROUP_URL = BASE_URL + u'/api2/group/'
GROUPS_URL = BASE_URL + u'/api2/groups/'
GROUPMSGS_URL = BASE_URL + u'/api2/group/msgs/'
GROUPMSGS_NREPLY_URL = BASE_URL + u'/api2/new_replies/'

STARREDFILES_URL = BASE_URL + u'/api2/starredfiles/'

META_AUTH = {'username': USERNAME, 'password': PASSWORD}

def get_auth_token():
  res = requests.post(TOKEN_URL, data=META_AUTH)
  if (res.status_code != 200):
    return None
  token = res.json()['token']
  if (re.match(r'(\w){40,40}', token) == None):
    return None
  return token

_token = get_auth_token()
if (_token != None):
  _instance = requests.Session()
  _instance.headers.update({'Authorization': 'Token ' + _token})
else:
  _instance = None

def get_authed_instance():
  return _instance

