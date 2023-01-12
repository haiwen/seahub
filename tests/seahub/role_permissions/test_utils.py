from seahub.constants import GUEST_USER, DEFAULT_USER
from seahub.role_permissions.utils import (
    get_available_roles, get_enabled_role_permissions_by_role)
from seahub.test_utils import BaseTestCase


class UtilsTest(BaseTestCase):
    def test_get_available_role(self):
        assert len(get_available_roles()) == 2
        assert GUEST_USER in get_available_roles()
        assert DEFAULT_USER in get_available_roles()

    def test_get_enabled_role_permissions_by_role(self):
        assert len(list(get_enabled_role_permissions_by_role(DEFAULT_USER).keys())) == 19
