import copy
from mock import patch
from django.test import override_settings

from seahub.test_utils import BaseTestCase
from seahub.base.accounts import User, RegistrationForm
from seahub.options.models import UserOptions
from seahub.role_permissions.settings import ENABLED_ROLE_PERMISSIONS


TEST_CAN_ADD_PUBLICK_REPO_TRUE = copy.deepcopy(ENABLED_ROLE_PERMISSIONS)
TEST_CAN_ADD_PUBLICK_REPO_TRUE['default']['can_add_public_repo'] = True

TEST_PUBLISH_REPO_CAN_PUBLISH_REPO_FALSE = copy.deepcopy(ENABLED_ROLE_PERMISSIONS)
TEST_PUBLISH_REPO_CAN_PUBLISH_REPO_FALSE['default']['can_publish_repo'] = False

CLOUD_MODE_TRUE = True
MULTI_TENANCY_TRUE = True
MULTI_TENANCY_FALSE = False


class UserTest(BaseTestCase):

    def test_freeze_user(self):

        u = User.objects.get(self.user.username)
        u.freeze_user(notify_admins=False)

        assert u.is_active is False

    def test_delete_user_options(self):
        test_email = '123@123.com'

        assert len(UserOptions.objects.filter(email=test_email)) == 0

        self.create_user(test_email)
        UserOptions.objects.enable_server_crypto(test_email)

        assert len(UserOptions.objects.filter(email=test_email)) == 1

        user = User.objects.get(email=test_email)
        user.delete()

        assert len(UserOptions.objects.filter(email=test_email)) == 0


@override_settings(ENABLE_WIKI=True)
class UserPermissionsTest(BaseTestCase):

    def setUp(self):
        from constance import config
        self.config = config

    def test_permissions(self):
        assert self.user.permissions.can_add_repo() is True
        assert self.user.permissions.can_add_group() is True
        assert self.user.permissions.can_generate_share_link() is True
        assert self.user.permissions.can_generate_upload_link() is True
        assert self.user.permissions.can_use_global_address_book() is True
        assert self.user.permissions.can_view_org() is True
        assert self.user.permissions.can_drag_drop_folder_to_sync() is True
        assert self.user.permissions.can_connect_with_android_clients() is True
        assert self.user.permissions.can_connect_with_ios_clients() is True
        assert self.user.permissions.can_connect_with_desktop_clients() is True
        assert self.user.permissions.can_invite_guest() is False
        assert self.user.permissions.can_export_files_via_mobile_client() is True

    def test_admin_permissions_can_add_public_repo(self):

        assert self.admin.permissions.can_add_public_repo() is True

    @patch('seahub.base.accounts.CLOUD_MODE', CLOUD_MODE_TRUE)
    def test_CLOUD_MODE_permissions_can_add_public_repo(self):

        with patch('seahub.base.accounts.MULTI_TENANCY', MULTI_TENANCY_TRUE):
            assert self.user.permissions.can_add_public_repo() is True
        with patch('seahub.base.accounts.MULTI_TENANCY', MULTI_TENANCY_FALSE):
            assert self.user.permissions.can_add_public_repo() is False

    def test_user_permissions_can_add_public_repo(self):
        # both have
        with patch('seahub.role_permissions.utils.ENABLED_ROLE_PERMISSIONS', TEST_CAN_ADD_PUBLICK_REPO_TRUE):
            assert self.user.permissions._get_perm_by_roles('can_add_public_repo') is True
            assert self.user.permissions.can_add_public_repo() is True

    def test_can_publish_repo_permission(self):
        # enableWIKI = True, and can_publish_repo = True
        assert self.user.permissions._get_perm_by_roles('can_publish_repo') is True
        assert self.user.permissions.can_publish_repo() is True

    @override_settings(ENABLE_WIKI=False)
    def test_can_publish_repo_permission_with_enable_wiki_False(self):
        # enableWIKI = False, and can_publish_repo = True
        assert self.user.permissions._get_perm_by_roles('can_publish_repo') is True
        assert self.user.permissions.can_publish_repo() is False

    def test_can_publish_repo_permission_with_can_publish_repo_False(self):
        # enableWIKI = True, and can_publish_repo = False
        with patch('seahub.role_permissions.utils.ENABLED_ROLE_PERMISSIONS', TEST_PUBLISH_REPO_CAN_PUBLISH_REPO_FALSE):
            assert self.user.permissions._get_perm_by_roles('can_publish_repo') is False
            assert self.user.permissions.can_publish_repo() is False


class RegistrationFormTest(BaseTestCase):
    def setUp(self):
        self.valid_emails = [
            'a@1.com',
            'a.1@1.com',
            'a+.1@1.com-pany',
            'a+-_.1@1.com-pany',
        ]

        self.invalid_emails = [
            '"a"@1.com',
            '<script>@1.com',
            '//@1.com',
            'a+.-{}?1@1.com',
            'a+.-()1@1.com',
        ]

        self.form_class = RegistrationForm

    def test_allow_register(self):
        for e in self.valid_emails:
            assert self.form_class.allow_register(e) is True

        for e in self.invalid_emails:
            assert self.form_class.allow_register(e) is False

    def test_clean_email(self):
        form = self.form_class({'email': 'some_random_user@1.com',
                                'password1': '123',
                                'password2': '123'})
        assert form.is_valid() is True
        assert form.clean_email() == 'some_random_user@1.com'
