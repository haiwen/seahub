from integration import HOME_URL, LOGOUT_URL, get_logged_instance
import unittest

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
