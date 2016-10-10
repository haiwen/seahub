import pytest

from tests.common.utils import randstring
from tests.common.common import BASE_URL

repo_name = 'test-repo-{}'.format(randstring(10))

download_link = ''
encrypted_download_link = ''
password = ''

@pytest.mark.usefixtures("session", "anonymous_session")
class TestShareLink:

    def test_generate_normal_share_link(self, session):
        """Create a normal share link.
        """

        global download_link
        global repo_name

        session.visit(BASE_URL)

        if not session.repo_exist(repo_name):
            session.create_repo(repo_name)

        session.enter_repo(repo_name)
        file_name = 'test-file-{}'.format(randstring(10))
        session.create_file(file_name)

        download_link = session.share_file(file_name)
        assert session.can_visit_download_link(download_link)

    def test_generate_encrypted_share_link(self, session):
        """Create an encrypted share link.
        """

        global encrypted_download_link
        global password
        global repo_name

        session.visit(BASE_URL)

        if not session.repo_exist(repo_name):
            session.create_repo(repo_name)

        session.enter_repo(repo_name)
        file_name = 'test-file-{}'.format(randstring(10))
        session.create_file(file_name)

        password = randstring(10)
        encrypted_download_link = session.share_file(file_name, password)

        assert session.can_visit_download_link(encrypted_download_link,
                encrypted=True, password=password)

    def test_visit_download_link(self, anonymous_session):
        """Anonymous user visit download share link.
        """

        global download_link

        assert anonymous_session.can_visit_download_link(download_link)

    def test_anonymous_visit_encrypted_download_link(self, anonymous_session):
        """Anonymous user visit encrypted download share link.
        """

        global encrypted_download_link

        assert anonymous_session.can_visit_download_link(encrypted_download_link,
                encrypted=True, password=password)
