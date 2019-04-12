from seahub.test_utils import BaseTestCase
from seahub.base.accounts import User, RegistrationForm

from seahub.options.models import UserOptions
from post_office.models import Email
from django.core.urlresolvers import reverse
from mock import patch


TEST_ADD_PUBLIC_ENABLED_ROLE_PERMISSIONS = {
    'default': {
        'can_add_repo': True,
        'can_add_group': True,
        'can_view_org': True,
        'can_add_public_repo': True,
        'can_use_global_address_book': True,
        'can_generate_share_link': True,
        'can_generate_upload_link': True,
        'can_send_share_link_mail': True,
        'can_invite_guest': False,
        'can_drag_drop_folder_to_sync': True,
        'can_connect_with_android_clients': True,
        'can_connect_with_ios_clients': True,
        'can_connect_with_desktop_clients': True,
        'can_export_files_via_mobile_client': True,
        'storage_ids': [],
        'role_quota': '',
        'can_use_wiki': True,
    },
    'guest': {
        'can_add_repo': False,
        'can_add_group': False,
        'can_view_org': False,
        'can_add_public_repo': False,
        'can_use_global_address_book': False,
        'can_generate_share_link': False,
        'can_generate_upload_link': False,
        'can_send_share_link_mail': False,
        'can_invite_guest': False,
        'can_drag_drop_folder_to_sync': False,
        'can_connect_with_android_clients': False,
        'can_connect_with_ios_clients': False,
        'can_connect_with_desktop_clients': False,
        'can_export_files_via_mobile_client': False,
        'storage_ids': [],
        'role_quota': '',
        'can_use_wiki': False,
    },
}

CLOUD_MODE_TRUE = True
MULTI_TENANCY_TRUE = True
MULTI_TENANCY_FALSE = False

class UserTest(BaseTestCase):
    def test_freeze_user(self):
        assert len(Email.objects.all()) == 0

        u = User.objects.get(self.user.username)
        u.freeze_user(notify_admins=True)

        assert u.is_active is False

        assert len(Email.objects.all()) > 0
        # email = Email.objects.all()[0]
        # print email.html_message

    def test_delete_user_options(self):
        test_email = '123@123.com'

        assert len(UserOptions.objects.filter(email=test_email)) == 0

        User.objects.create_user(test_email)
        UserOptions.objects.enable_server_crypto(test_email)

        assert len(UserOptions.objects.filter(email=test_email)) == 1

        user = User.objects.get(email=test_email)
        user.delete()
        
        assert len(UserOptions.objects.filter(email=test_email)) == 0

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
        self.config.ENABLE_USER_CREATE_ORG_REPO = 1
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is True
        with patch('seahub.role_permissions.utils.ENABLED_ROLE_PERMISSIONS', TEST_ADD_PUBLIC_ENABLED_ROLE_PERMISSIONS):
            assert self.user.permissions._get_perm_by_roles('can_add_public_repo') is True
            assert self.user.permissions.can_add_public_repo() is True

        # only have can_add_public_repo
        self.config.ENABLE_USER_CREATE_ORG_REPO = 0
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is False
        with patch('seahub.role_permissions.utils.ENABLED_ROLE_PERMISSIONS', TEST_ADD_PUBLIC_ENABLED_ROLE_PERMISSIONS):
            assert self.user.permissions._get_perm_by_roles('can_add_public_repo') is True
            assert self.user.permissions.can_add_public_repo() is False

        # only have ENABLE_USER_CREATE_ORG_REPO
        self.config.ENABLE_USER_CREATE_ORG_REPO = 1
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is True
        assert self.user.permissions._get_perm_by_roles('can_add_public_repo') is False
        assert self.user.permissions.can_add_public_repo() is False

        # neither have
        self.config.ENABLE_USER_CREATE_ORG_REPO = 0
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is False
        assert self.user.permissions._get_perm_by_roles('can_add_public_repo') is False
        assert self.user.permissions.can_add_public_repo() is False


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
                                'password2': '123',
                            })
        assert form.is_valid() is True
        assert form.clean_email() == 'some_random_user@1.com'
