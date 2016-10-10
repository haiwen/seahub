import pytest

from tests.common.utils import randstring
from tests.common.common import GROUPS_URL

group_name = 'test-group-{}'.format(randstring(10))
group_url = ''


@pytest.mark.usefixtures("session", "anonymous_session")
class TestGroup:

    def test_create_group(self, session):
        """Create a group.
        """

        global group_name
        global group_url

        session.visit(GROUPS_URL)

        if session.group_exist(group_name):
            session.delete_group(group_name)

        assert not session.group_exist(group_name)
        group_name = 'test-group-{}'.format(randstring(10))
        group_url = session.create_group(group_name)
        assert session.group_exist(group_name)

    def test_rename_group(self, session):
        """Rename a group.
        """

        global group_name
        global group_url

        session.visit(GROUPS_URL)

        if not session.group_exist(group_name):
            group_url = session.create_group(group_name)

        assert session.group_exist(group_name)
        new_group_name = 'test-group-{}'.format(randstring(10))
        session.rename_group(group_name, new_group_name)
        assert session.group_exist(new_group_name)
        group_name = new_group_name

    def test_delete_group(self, session):
        """Delete a group.
        """

        global group_name
        global group_url

        session.visit(GROUPS_URL)

        if not session.group_exist(group_name):
            group_url = session.create_group(group_name)

        assert session.group_exist(group_name)
        session.delete_group(group_name)

        session.visit(GROUPS_URL)
        assert not session.group_exist(group_name)

    def test_anonymous_enter_group(self, anonymous_session):
        """Anonymous user enter repo.
        """

        global group_name
        global group_url

        anonymous_session.visit(group_url)
        assert anonymous_session.current_page_is_login_page()
