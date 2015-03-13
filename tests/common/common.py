import os
import urlparse

BASE_URL = os.getenv('SEAHUB_TEST_BASE_URL', u'http://127.0.0.1:8000')
USERNAME = os.getenv('SEAHUB_TEST_USERNAME', u'test@seafiletest.com')
PASSWORD = os.getenv('SEAHUB_TEST_PASSWORD', u'testtest')
ADMIN_USERNAME = os.getenv('SEAHUB_TEST_ADMIN_USERNAME', u'admin@seafiletest.com')
ADMIN_PASSWORD = os.getenv('SEAHUB_TEST_ADMIN_PASSWORD', u'adminadmin')

if os.getenv('SEAHUB_TEST_IS_PRO', u'') == u'':
    IS_PRO = False
else:
    S_PRO = True

def get_seafile_http_sync_base_url():
    u = urlparse.urlparse(BASE_URL)
    return '{}://{}/seafhttp'.format(u.scheme, u.hostname)

SEAFILE_BASE_URL = get_seafile_http_sync_base_url()
