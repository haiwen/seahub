from seahub.test_utils import BaseTestCase
from seahub.base.accounts import User

from post_office.models import Email

class UserTest(BaseTestCase):
    def test_freeze_user(self):
        assert len(Email.objects.all()) == 0

        u = User.objects.get(self.user.username)
        u.freeze_user(notify_admins=True)

        assert u.is_active is False

        assert len(Email.objects.all()) > 0
        # email = Email.objects.all()[0]
        # print email.html_message


class UserPermissionsTest(BaseTestCase):
    def test_permissions(self):
        assert self.user.permissions.can_add_repo() is True
        assert self.user.permissions.can_add_group() is True
        assert self.user.permissions.can_generate_shared_link() is True
        assert self.user.permissions.can_use_global_address_book() is True
        assert self.user.permissions.can_view_org() is True
        assert self.user.permissions.can_drag_drop_folder_to_sync() is True
        assert self.user.permissions.can_connect_with_android_clients() is True
        assert self.user.permissions.can_connect_with_ios_clients() is True
        assert self.user.permissions.can_connect_with_desktop_clients() is True
        assert self.user.permissions.can_invite_guest() is False

        assert self.user.permissions.can_export_files_via_mobile_client() is True
