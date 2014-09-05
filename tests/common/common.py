import os

BASE_URL = os.getenv('TEST_BASE_URL', u'http://127.0.0.1:8000')
USERNAME = os.getenv('TEST_USERNAME', u'test@seahubtest.com')
PASSWORD = os.getenv('TEST_PASSWORD', u'testtest')

ADMIN_USERNAME = os.getenv('TEST_ADMIN_USERNAME', u'admin@seahubtest.com')
ADMIN_PASSWORD = os.getenv('TEST_ADMIN_PASSWORD', u'adminadmin')

if BASE_URL[-1] != '/':
    BASE_URL += '/'

if os.getenv('TEST_IS_PRO', u'') == u'':
    IS_PRO = False
else:
    S_PRO = True
