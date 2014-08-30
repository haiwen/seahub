from common.common import BASE_URL, USERNAME, PASSWORD, IS_PRO
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

_nuked_instance = requests.Session()

def get_authed_instance():
  return _instance

def get_anonymous_instance():
  return _nuked_instance