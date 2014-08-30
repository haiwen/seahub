from common.common import BASE_URL, USERNAME, PASSWORD
from selenium import webdriver
from selenium.webdriver.common.keys import Keys

import unittest

LOGIN_URL = BASE_URL + u'/accounts/login/'
HOME_URL = BASE_URL + u'/home/my/'
LOGOUT_URL = BASE_URL + u'/accounts/logout/'

def get_logged_instance():
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

class LoginTestCase(unittest.TestCase):

  def setUp(self):
    self.browser = get_logged_instance()
    self.assertIsNotNone(self.browser)
    self.addCleanup(self.browser.quit)

  def test_login(self):
    self.assertRegexpMatches(self.browser.current_url, HOME_URL)

  def test_logout(self):
    myinfo_bar = self.browser.find_element_by_css_selector('#my-info')
    logout_input = self.browser.find_element_by_css_selector('a#logout')
    myinfo_bar.click()
    logout_input.click()
    self.assertRegexpMatches(self.browser.current_url, LOGOUT_URL)

if __name__ == '__main__':
  unittest.main(verbosity=2)
