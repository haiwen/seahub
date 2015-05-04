from contextlib import contextmanager
from pytest import yield_fixture # pylint: disable=E1101
from tests.ui.driver import Browser
from tests.common.common import (
    BASE_URL, USERNAME, PASSWORD, ADMIN_USERNAME, ADMIN_PASSWORD
)

@yield_fixture(scope='session')
def browser():
    """Get an instance of a browser that already logged in.

    Note this browser instance are shared among all test cases.
    """
    with _create_browser(admin=False) as browser:
        yield browser

@yield_fixture(scope='session')
def admin_browser():
    """Get an instance of a browser that already logged in with admin credentials.

    This browser instance are shared among all test cases.
    """
    with _create_browser(admin=True) as browser:
        yield browser

@yield_fixture(scope='function')
def admin_browser_once():
    """Get an instance of a browser that already logged in with admin credentials.

    This browser instance are created/destroyed for each test case.
    """
    with _create_browser(admin=True) as browser:
        yield browser

@contextmanager
def _create_browser(admin=False):
    username, password = (ADMIN_USERNAME, ADMIN_PASSWORD) \
                         if admin else (USERNAME, PASSWORD)
    b = Browser(BASE_URL)
    b.gohome()
    assert b.path == '/accounts/login/'

    b.fill_form({
        'username': username,
        'password': password
    })
    b.submit_by_input_name('username')
    assert b.path != '/accounts/login/'

    try:
        yield b
    finally:
        b.quit()
