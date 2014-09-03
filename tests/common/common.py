import os

BASE_URL = os.getenv('CI_BASE_URL', u'http://127.0.0.1:8000')
USERNAME = os.getenv('CI_USERNAME', u'test@test.com')
PASSWORD = os.getenv('CI_PASSWORD', u'testtest')

if BASE_URL[-1] != '/':
    BASE_URL += '/'

if os.getenv('CI_IS_PRO', u'') == u'':
  IS_PRO = False
else:
  IS_PRO = True
