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
from selenium import webdriver
from selenium.webdriver.common.keys import Keys

LOGIN_URL = common.getBaseUrl() + u'/accounts/login/'
HOME_URL = common.getBaseUrl() + u'/home/my/'
LOGOUT_URL = common.getBaseUrl() + u'/accounts/logout/'

USERNAME = common.getUserName()
PASSWORD = common.getPassword()

def getLoggedInstance():
  browser = webdriver.PhantomJS()
  browser.get(LOGIN_URL)
  username_input = browser.find_element_by_name('username')
  password_input = browser.find_element_by_name('password')
  username_input.send_keys(USERNAME)
  password_input.send_keys(PASSWORD)
  password_input.send_keys(Keys.RETURN)
  if (browser.current_url != HOME_URL):
    browser.quit()
    return None
  return browser
