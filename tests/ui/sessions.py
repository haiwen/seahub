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
        self.anonymous_sessions = []

    def end(self):
        for session in self.anonymous_sessions:
            session.end()
        self.browser.quit()

    def get_anonymous_session(self, url=None):
        """Get a differnt session instance that's not logged in. Useful when we want
        to check some page is not accessible by not logged in users.
        """
        session = SeafileSession(self.seahub_url)
        self.anonymous_sessions.append(session)
        if url:
            session.visit(url)
        return session

    def login(self, username, password):
        self.browser.visit(self.seahub_url)
        assert self.browser.path == '/accounts/login/'
        self.browser.fill_form({'login': username, 'password': password})
        self.browser.submit_by_input_name('password')
        assert self.browser.path != '/accounts/login/'

    def visit(self, url):
        self.browser.visit(url)

    def create_repo(self, repo_name):
        self.browser.click('button.repo-create')
        self.browser.fill('repo_name', repo_name)
        self.browser.submit_by_input_name('repo_name')

    def enter_repo(self, repo_name):
        table_selector = '#my-own-repos table'
        self.browser.wait_for_element_visible(table_selector)
        self.browser.click_link_by_text(repo_name)

    def move_mouse_onto_repo(self, repo_name):
        table_selector = '#my-own-repos table'
        self.browser.wait_for_element_visible(table_selector)
        repo_link = self.browser.find_link_by_text(repo_name)

        self.browser.move_mouse_to(repo_link)
        self.browser.wait_for_element_visible('div.op-container')

    def create_file(self, file_name):
        self.browser.click('#add-new-file')
        self.browser.wait_for_element_visible('#simplemodal-container')
        self.browser.fill('name', file_name)
        self.browser.submit_by_input_name('name')

    def move_mouse_onto_repo_file(self, file_name):
        file_link = self.browser.find_link_by_text(file_name)
        self.browser.move_mouse_to(file_link)

    def wait_for_popup(self):
        self.browser.wait_for_element_visible('#simplemodal-container')

    def share_file(self, file_name, password=None):
        # Click the share button so that the share dialog would pop up.
        self.move_mouse_onto_repo_file(file_name)
        self.browser.click('span.share')
        self.wait_for_popup()

        if password:
            self.browser.check('use_passwd')
            self.browser.wait_for_element_visible('input.passwd')
            self.browser.fill_form({'password': password,
                                    'password_again': password, })
        self.browser.submit_by_input_name('use_passwd')

        share_link = self.browser.get_element_text('#download-link')
        return share_link

    def can_access_share_link(self, file_name):
        if self.browser.find('#share-passwd-form'):
            return False
        return self.browser.find_by_text(file_name).visible

    def is_asked_for_share_link_password(self):
        return self.browser.find('#share-passwd-form').visible

    def send_share_link_password(self, password):
        self.browser.fill('password', password)
        self.browser.submit_by_input_name('password')

    def is_displayed_passsword_error(self):
        return self.browser.find('p.error').visible
