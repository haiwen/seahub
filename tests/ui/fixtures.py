import pytest
from tests.ui.sessions import SeafileSession
from tests.common.common import (BASE_URL, MY_LIBS_URL, GROUPS_URL,
        USERNAME, PASSWORD, ADMIN_USERNAME, ADMIN_PASSWORD)

@pytest.fixture(scope='class')
def session(request):
    """Get an instance of a session that already logged in.
    """

    session = SeafileSession(BASE_URL)
    session.login(USERNAME, PASSWORD)
    yield session

    repo_name = getattr(request.module, "repo_name", None)
    if repo_name:
        session.visit(MY_LIBS_URL)
        if session.repo_exist(repo_name):
            session.delete_repo(repo_name)

    group_name = getattr(request.module, "group_name", None)
    if group_name:
        session.visit(GROUPS_URL)
        if session.group_exist(group_name):
            session.delete_group(group_name)

    session.end()

@pytest.fixture(scope='class')
def admin_session(request):
    """Get an instance of an admin session that already logged in.
    """

    session = SeafileSession(BASE_URL)
    session.login(ADMIN_USERNAME, ADMIN_PASSWORD)
    yield session

    session.end()

@pytest.fixture(scope='class')
def anonymous_session(request):
    """Get an instance of a session that's not logged in.
    """
    session = SeafileSession(BASE_URL)
    yield session

    session.end()
