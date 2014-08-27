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
from common import common
import requests, re

PING_URL = common.getBaseUrl() + u'/api2/ping/'
TOKEN_URL = common.getBaseUrl() + u'/api2/auth-token/'
AUTH_PING_URL = common.getBaseUrl() + u'/api2/auth/ping/'

USERNAME = common.getUserName()
PASSWORD = common.getPassword()
META_AUTH = {'username': USERNAME, 'password': PASSWORD}

def getAuthToken():
  res = requests.post(TOKEN_URL, data=META_AUTH)
  if (res.status_code != 200):
    return None
  token = res.json()['token']
  if (re.match(r'(\w){40,40}', token) == None):
    return None
  return token

def getAuthedInstance():
  token = getAuthToken()
  if (token == None):
    return None
  s = requests.Session()
  s.headers.update({'Authorization': 'Token ' + token})
  return s
