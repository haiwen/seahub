import os
import urllib.parse

BASE_URL = os.getenv('SEAHUB_TEST_BASE_URL', 'http://127.0.0.1:8000')
USERNAME = os.getenv('SEAHUB_TEST_USERNAME', 'test@example.com')
PASSWORD = os.getenv('SEAHUB_TEST_PASSWORD', 'testtest')
ADMIN_USERNAME = os.getenv('SEAHUB_TEST_ADMIN_USERNAME', 'admin@example.com')
ADMIN_PASSWORD = os.getenv('SEAHUB_TEST_ADMIN_PASSWORD', 'adminadmin')

if os.getenv('SEAHUB_TEST_IS_PRO', '') == '':
    IS_PRO = False
else:
    S_PRO = True

def get_seafile_http_sync_base_url():
    u = urllib.parse.urlparse(BASE_URL)
    return '{}://{}/seafhttp'.format(u.scheme, u.hostname)

SEAFILE_BASE_URL = get_seafile_http_sync_base_url()
