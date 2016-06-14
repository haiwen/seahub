from seahub.test_utils import BaseTestCase
from seahub.base.accounts import User, RegistrationForm

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
