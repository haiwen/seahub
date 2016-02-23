from contextlib import contextmanager
from pytest import yield_fixture  # pylint: disable=E1101
from tests.ui.sessions import SeafileSession
from tests.common.common import (BASE_URL, USERNAME, PASSWORD, ADMIN_USERNAME,
                                 ADMIN_PASSWORD)


@yield_fixture(scope='function')
def session():
    """Get an instance of a session that already logged in.
    """
    with _create_session(admin=False) as session:
        yield session


@yield_fixture(scope='function')
def anonymous_sessions():
    """Get an instance of a session that's not logged in.
    """
    session = SeafileSession(BASE_URL)
    try:
        yield session
    except:
        print 'Unexpected error at url "{}"'.format(session.browser.path)
        raise
    finally:
        session.end()


@yield_fixture(scope='function')
def admin_session():
    """Get an instance of a session that already logged in with admin credentials.

    This session instance are shared among all test cases.
    """
    with _create_session(admin=True) as session:
        yield session


@contextmanager
def _create_session(admin=False):
    username, password = (ADMIN_USERNAME, ADMIN_PASSWORD) \
                         if admin else (USERNAME, PASSWORD)
    session = SeafileSession(BASE_URL)
    try:
        session.login(username, password)
        yield session
    except:
        print 'Unexpected error at url "{}"'.format(session.browser.path)
        raise
    finally:
        session.end()
