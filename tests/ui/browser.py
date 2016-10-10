import os
import urlparse
import requests
import splinter
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from splinter.driver.webdriver import WebDriverElement

from tests.common.utils import urljoin


def create_browser():
    imp = os.environ.get('WEBDRIVER', 'phantomjs')
    if imp in ('firefox', 'ff'):
        driver = 'firefox'
    elif imp in ('chrome', 'chromium'):
        driver = 'chrome'
    else:
        driver = 'phantomjs'
    return splinter.Browser(driver)


class Browser(object):
    """Provide interface for common browser operations like click a button, check
    a checkbox, and advanced operations like wait until an element is visible.
    """

    def __init__(self, base_url, existing_browser=None):
        if not existing_browser:
            self.browser = create_browser()
        else:
            self.browser = existing_browser

        self.driver = self.browser.driver
        self.driver.maximize_window()

        self.base_url = base_url

    @property
    def title(self):
        return self.browser.title

    @property
    def path(self):
        return urlparse.urlparse(self.browser.url).path

    def quit(self):
        self.browser.quit()

    def visit(self, url):
        if not url.startswith('http'):
            url = urljoin(self.base_url, url)
        self.browser.visit(url)

    def _el(self, selector):
        elements = self.browser.find_by_css(selector)
        if elements:
            return elements.first

    def click(self, selector):
        self.wait_for_element_visible(selector)
        self._el(selector).click()

    def click_link_by_text(self, text):
        self.browser.find_link_by_text(text).first.click()

    def click_link_by_title(self, title):
        self.browser.find_by_xpath('//a[@title="%s"]' % title).first.click()

    def check(self, name):
        self.browser.check(name)

    def find(self, selector):
        return self._el(selector)

    def find_by_id(self, element_id):
        return self.browser.find_by_id(element_id).first

    def find_by_name(self, name):
        return self.browser.find_by_name(name)

    def find_by_text(self, text):
        return self.browser.find_by_text(text).first

    def find_link_by_text(self, text):
        return self.browser.find_link_by_text(text).first

    def get_element_text(self, selector):
        self.wait_for_element_visible(selector)
        return self._el(selector).text

    def get_element_attr(self, selector, name):
        self.wait_for_element_visible(selector)
        return self._el(selector)._element.get_attribute(name)

    def submit(self, form_sel):
        self._el(form_sel)._element.submit()

    def submit_by_input_name(self, name):
        self.browser.find_by_name(name).first._element.submit()

    def fill(self, name, value):
        self.browser.fill(name, value)

    def fill_form(self, form_kvs):
        self.browser.fill_form(form_kvs)

    def wait_for_element_visible(self, selector, timeout=10):
        wait = WebDriverWait(self.driver, timeout)
        wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, selector
                                                     )))

    def get_file_content(self, url):
        sessionid = self.driver.get_cookie('sessionid')['value']
        return requests.get(url, cookies={'sessionid': sessionid}).text

    def move_mouse_to(self, element):
        if isinstance(element, basestring):
            element = self._el(element)

        if isinstance(element, WebDriverElement):
            element = element._element
        action = ActionChains(self.driver)
        action.move_to_element(element)
        action.perform()
