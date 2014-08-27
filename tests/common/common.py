import os
if os.getenv('CI_BASE_URL'):
  BASE_URL = os.getenv('CI_BASE_URL')
else:
  BASE_URL = u'http://127.0.0.1:8000'

if os.getenv('CI_USERNAME'):
  USERNAME = os.getenv('CI_USERNAME')
else:
  USERNAME = u'test@test.com'

if os.getenv('CI_PASSWORD'):
  PASSWORD = os.getenv('CI_PASSWORD')
else:
  PASSWORD = u'testtest'

def getBaseUrl():
  return BASE_URL

def getUserName():
  return USERNAME

def getPassword():
  return PASSWORD
