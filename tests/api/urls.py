from tests.common.utils import apiurl

PING_URL = apiurl('/api2/ping/')
TOKEN_URL = apiurl('/api2/auth-token/')
AUTH_PING_URL = apiurl('/api2/auth/ping/')

ACCOUNTS_URL = apiurl('/api2/accounts/')
AVATAR_BASE_URL = apiurl('/api2/avatars/')

REPOS_URL = apiurl('/api2/repos/')
GET_REPO_TOKENS_URL = apiurl('/api2/repo-tokens/')

GROUPS_URL = apiurl('/api2/groups/')

USERMSGS_COUNT_URL = apiurl('/api2/unseen_messages/')

STARREDFILES_URL = apiurl('/api2/starredfiles/')
SHARED_LINKS_URL = apiurl('/api2/shared-links/')
SHARED_LIBRARIES_URL = apiurl('/api2/shared-repos/')
BESHARED_LIBRARIES_URL = apiurl('/api2/beshared-repos/')
F_URL = apiurl('/api2/f/')

DOWNLOAD_REPO_URL = apiurl('api2/repos/%s/download-info/')
LOGOUT_DEVICE_URL = apiurl('api2/logout-device/')

SERVER_INFO_URL = apiurl('/api2/server-info/')

CLIENT_LOGIN_TOKEN_URL = apiurl('/api2/client-login/')
