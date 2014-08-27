import os

BASE_URL = os.getenv('CI_BASE_URL', u'http://127.0.0.1:8000')
USERNAME = os.getenv('CI_USERNAME', u'test@test.com')
PASSWORD = os.getenv('CI_PASSWORD', u'testtest')
