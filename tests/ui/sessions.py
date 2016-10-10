import splinter
from tests.ui.browser import Browser

class SeafileSession(object):
    """A SeafileSession object represents a browser that visits seahub. It
    provides operations like `login`, `create_repo`, `share_file`, so that the
    tests code can focus on high-level workflow.

    It delegates the DOM manipulations to the `tests.ui.browser.Browser`
    object. So operations like clicking a button, geting an element by id, and
    filling a form should be implemented in the `Browser` class instead of
    here.
    """

    def __init__(self, seahub_url):
        """
        :type seahub_url: str
        """
        self.browser = Browser(seahub_url)
        self.seahub_url = seahub_url

    # common operation
    def end(self):
        self.browser.quit()

    def login(self, username, password):
        self.browser.visit(self.seahub_url)
        assert self.browser.path == '/accounts/login/'
        self.browser.wait_for_element_visible('input#login')
        self.browser.fill_form({'login': username, 'password': password})
        self.browser.submit_by_input_name('password')
        assert self.browser.path != '/accounts/login/'

        self.browser.click('a.by-time')

    def visit(self, url):
        self.browser.visit(url)

    def wait_for_popup(self):
        self.browser.wait_for_element_visible('#simplemodal-container')

    # operation for repo
    def create_repo(self, repo_name):
        self.browser.click('button.repo-create')
        self.browser.fill('repo_name', repo_name)
        self.browser.submit_by_input_name('repo_name')

        table_selector = '#my-own-repos table'
        self.browser.wait_for_element_visible(table_selector)
        repo_link = self.browser.get_element_attr('span.repo-name-span a', 'href')
        return repo_link

    def move_mouse_onto_repo(self, repo_name):
        table_selector = '#my-own-repos table'
        self.browser.wait_for_element_visible(table_selector)
        repo_link = self.browser.find_link_by_text(repo_name)

        self.browser.move_mouse_to(repo_link)
        self.browser.wait_for_element_visible('div.op-container')

    def enter_repo(self, repo_name):
        self.move_mouse_onto_repo(repo_name)

        self.browser.click_link_by_text(repo_name)

    def delete_repo(self, repo_name):
        self.move_mouse_onto_repo(repo_name)

        self.browser.click('a.repo-delete-btn')
        self.browser.wait_for_element_visible('#confirm-popup')
        self.browser.click('#confirm-yes')
        self.browser.wait_for_element_visible('li.success')

    def rename_repo(self, repo_name, new_repo_name):
        self.move_mouse_onto_repo(repo_name)

        self.browser.click('a.more-op-icon')
        self.browser.wait_for_element_visible('ul.repo-hidden-op')
        self.browser.click('a.js-repo-rename')
        self.browser.wait_for_element_visible('#repo-rename-form')
        self.browser.fill_form({'newname': new_repo_name})
        self.browser.submit_by_input_name('newname')

    # operation for group
    def create_group(self, group_name):
        self.browser.wait_for_element_visible('#add-group')
        self.browser.click('#add-group')

        self.browser.wait_for_element_visible('#group-add-form')
        self.browser.fill('group_name', group_name)
        self.browser.submit_by_input_name('group_name')

        group_url = self.browser.get_element_attr('h4.group-name a', 'href')
        return group_url

    def rename_group(self, group_name, new_group_name):
        self.browser.click_link_by_text(group_name)
        self.browser.wait_for_element_visible('#group-top')

        self.browser.click('#group-settings-icon')
        self.browser.wait_for_element_visible('#group-settings')

        self.browser.click_link_by_text('Rename')
        self.wait_for_popup()

        self.browser.fill_form({'new_name': new_group_name})
        self.browser.submit_by_input_name('new_name')

    def delete_group(self, group_name):
        self.browser.click_link_by_text(group_name)
        self.browser.wait_for_element_visible('#group-top')

        self.browser.click('#group-settings-icon')
        self.browser.wait_for_element_visible('#group-settings')

        self.browser.click_link_by_text('Dismiss')
        self.browser.wait_for_element_visible('#confirm-popup')
        self.browser.click('#confirm-yes')
        self.browser.wait_for_element_visible('#groups')

    # operation for file
    def create_file(self, file_name):
        self.browser.click('#add-new-file')
        self.browser.wait_for_element_visible('#simplemodal-container')
        self.browser.fill('name', file_name)
        self.browser.submit_by_input_name('name')

    def move_mouse_onto_repo_file(self, file_name):
        file_link = self.browser.find_link_by_text(file_name)
        self.browser.move_mouse_to(file_link)
        self.browser.wait_for_element_visible('div.op-container')

    # operation for share link
    def share_file(self, file_name, password=None):
        # Click the share button so that the share dialog would pop up.
        self.move_mouse_onto_repo_file(file_name)
        self.browser.click('a.share')
        self.wait_for_popup()

        if password:
            self.browser.check('use_passwd')
            self.browser.wait_for_element_visible('input.passwd')
            self.browser.fill_form({'password': password,
                                    'password_again': password, })
        self.browser.submit_by_input_name('use_passwd')

        share_link = self.browser.get_element_text('#download-link')
        return share_link

    def send_share_link_password(self, password):
        self.browser.fill('password', password)
        self.browser.submit_by_input_name('password')

    # assert functions
    def can_visit_download_link(self, download_link_url,
            encrypted=False, password=None):

        self.browser.visit(download_link_url)
        if not encrypted:
            return self.browser.find_by_id('shared-file-view-hd').visible

        if not self.browser.find('#share-passwd-form').visible:
            return False

        self.browser.fill('password', password)
        self.browser.submit_by_input_name('password')

        if self.browser.find('p.error').visible:
            return False

        return self.browser.find_by_id('shared-file-view-hd').visible

    def current_page_is_login_page(self):
        if self.browser.path == '/accounts/login/':
            return True
        else:
            False

    def repo_exist(self, repo_name):
        try:
            return self.browser.find_by_text(repo_name).visible
        except splinter.exceptions.ElementDoesNotExist:
            return False

    def group_exist(self, group_name):
        try:
            return self.browser.find_by_text(group_name).visible
        except splinter.exceptions.ElementDoesNotExist:
            return False
