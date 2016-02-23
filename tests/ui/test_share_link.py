import pytest

from tests.common.utils import randstring

def test_generate_normal_share_link(session):
    """Create a normal share link and verifies unlogined user can access it.

    :type session: tests.ui.sessions.SeafileSession
    """
    repo_name = 'test-repo-{}'.format(randstring(10))
    session.create_repo(repo_name)
    session.enter_repo(repo_name)

    file_name = 'test-file-{}'.format(randstring(10))
    session.create_file(file_name)

    share_link = session.share_file(file_name)

    visitor = session.get_anonymous_session(share_link)
    assert visitor.can_access_share_link(file_name)


def test_generate_encrypted_share_link(session):
    """Create an encrypted share link and verifies it can only be visited when
    correct password is provided.

    :type session: tests.ui.sessions.SeafileSession
    """
    repo_name = 'test-repo-{}'.format(randstring(10))
    session.create_repo(repo_name)
    session.enter_repo(repo_name)

    file_name = 'test-file-{}'.format(randstring(10))
    session.create_file(file_name)

    password = randstring(10)
    share_link = session.share_file(file_name, password)

    visitor = session.get_anonymous_session(share_link)
    assert visitor.is_asked_for_share_link_password()

    visitor.send_share_link_password('incorrectpassword')
    assert visitor.is_displayed_passsword_error()
    assert visitor.is_asked_for_share_link_password()

    visitor.send_share_link_password(password)
    assert visitor.can_access_share_link(file_name)
