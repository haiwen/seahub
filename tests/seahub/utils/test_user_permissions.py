from seahub.base.accounts import User
from seahub.constants import DEFAULT_USER
from seahub.test_utils import BaseTestCase
from seahub.utils.user_permissions import get_user_role


class UserPermissionsTest(BaseTestCase):
    def setUp(self):
        self.user = self.create_user()

    def tearDown(self):
        self.remove_user(self.user.email)

    def test_get_user_role(self):
        assert not self.user.role
        assert get_user_role(self.user) == DEFAULT_USER

        User.objects.update_role(self.user.email, 'test_role')
        u = User.objects.get(self.user.email)
        assert get_user_role(u) == 'test_role'
