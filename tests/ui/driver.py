import os
import urlparse
import requests
import splinter
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from tests.common.utils import urljoin

class Browser(object):
    '''Drives the browser in the functional test'''
    def __init__(self, start_url):
        imp = os.environ.get('WEBDRIVER', 'firfox')
        if imp in ('firefox', 'ff'):
            driver = 'firefox'
        else:
            driver = 'phantomjs'
        self.b = splinter.Browser(driver)
        self.d = self.b.driver
        self.d.set_window_size(1400, 1000)
        self.start_url = start_url

    def _el(self, selector):
        return self.b.find_by_css(selector).first

    @property
    def title(self):
        return self.b.title

    @property
    def path(self):
        return urlparse.urlparse(self.b.url).path

    def visit(self, url):
        if not url.startswith('http'):
            url = urljoin(self.start_url, url)
        self.b.visit(url)

    def gohome(self):
        self.b.visit(self.start_url)

    def click_link_by_text(self, text):
        self.b.find_link_by_text(text).first.click()

    def click_link_by_title(self, title):
        self.b.find_by_xpath('//a[@title="%s"]' % title).first.click()

    def find_link_by_text(self, text):
        return self.b.find_link_by_text(text).first

    def element_text(self, selector):
        return self._el(selector).text

    def element_attr(self, selector, name):
        return self._el(selector)._element.get_attribute(name)

    def click(self, selector):
        self._el(selector).click()

    def fill_form(self, form_kvs):
        self.b.fill_form(form_kvs)

    def find_by_name(self, name):
        return self.b.find_by_name(name)

    def submit(self, form_sel):
        self._el(form_sel)._element.submit()

    def submit_by_input_name(self, name):
        self.b.find_by_name(name).first._element.submit()

    def fill(self, name, value):
        self.b.fill(name, value)

    def fill_input_by_label(self, label, value):
        # TODO: implement this, and use it to locate inputs in tests, instead
        # of locating inputs by css selector. This is better for blackbox testing.
        pass

    def click_btn_with_text(self, text):
        # TODO: same as fill_input_by_label
        pass

    def quit(self):
        self.b.quit()

    def wait_for_element(self, selector, timeout):
        wait = WebDriverWait(self.d, timeout)
        wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, selector)))

    def get_file_content(self, url):
        sessionid = self.d.get_cookie('sessionid')['value']
        return requests.get(url, cookies={'sessionid': sessionid}).text
