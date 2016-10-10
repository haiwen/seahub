import pytest

from tests.common.utils import randstring
from tests.common.common import BASE_URL

repo_name = 'test-repo-{}'.format(randstring(10))
repo_url = ''

@pytest.mark.usefixtures("session", "anonymous_session")
class TestRepo:

    def test_create_repo(self, session):
        """Create a normal library.
        """

        global repo_name
        global repo_url

        session.visit(BASE_URL)

        if session.repo_exist(repo_name):
            session.delete_repo(repo_name)

        assert not session.repo_exist(repo_name)
        repo_name = 'test-repo-{}'.format(randstring(10))
        repo_url = session.create_repo(repo_name)
        assert session.repo_exist(repo_name)

    def test_rename_repo(self, session):
        """Rename a normal library.
        """

        global repo_name
        global repo_url

        session.visit(BASE_URL)

        if not session.repo_exist(repo_name):
            repo_url = session.create_repo(repo_name)

        assert session.repo_exist(repo_name)
        new_repo_name = 'test-repo-{}'.format(randstring(10))
        session.rename_repo(repo_name, new_repo_name)
        assert session.repo_exist(new_repo_name)
        repo_name = new_repo_name

    def test_delete_repo(self, session):
        """Delete a normal library.
        """

        global repo_name
        global repo_url

        session.visit(BASE_URL)

        if not session.repo_exist(repo_name):
            repo_url = session.create_repo(repo_name)

        assert session.repo_exist(repo_name)
        session.delete_repo(repo_name)
        assert not session.repo_exist(repo_name)

    def test_anonymous_enter_repo(self, anonymous_session):
        """Anonymous user enter repo.
        """

        global repo_name
        global repo_url

        anonymous_session.visit(repo_url)
        assert anonymous_session.current_page_is_login_page()
