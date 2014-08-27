import integration as common
import unittest

class LoginTestCase(unittest.TestCase):

  def setUp(self):
    self.browser = common.getLoggedInstance()
    self.assertIsNotNone(self.browser)
    self.addCleanup(self.browser.quit)

  def testLogin(self):
    self.assertRegexpMatches(self.browser.current_url, common.HOME_URL)

  def testLogout(self):
    myinfo_bar = self.browser.find_element_by_css_selector('#my-info')
    logout_input = self.browser.find_element_by_css_selector('a#logout')
    myinfo_bar.click()
    logout_input.click()
    self.assertRegexpMatches(self.browser.current_url, common.LOGOUT_URL)

if __name__ == '__main__':
  unittest.main(verbosity=2)
