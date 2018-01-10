from seahub.test_utils import BaseTestCase
from seahub.base.accounts import User, RegistrationForm

from seahub.options.models import UserOptions
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
