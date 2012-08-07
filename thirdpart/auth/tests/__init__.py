from auth.tests.auth_backends import BackendTest, RowlevelBackendTest, AnonymousUserBackendTest, NoAnonymousUserBackendTest
from auth.tests.basic import BASIC_TESTS
from auth.tests.decorators import LoginRequiredTestCase
from auth.tests.forms import UserCreationFormTest, AuthenticationFormTest, SetPasswordFormTest, PasswordChangeFormTest, UserChangeFormTest, PasswordResetFormTest
from auth.tests.remote_user \
        import RemoteUserTest, RemoteUserNoCreateTest, RemoteUserCustomTest
from auth.tests.models import ProfileTestCase
from auth.tests.tokens import TOKEN_GENERATOR_TESTS
from auth.tests.views \
        import PasswordResetTest, ChangePasswordTest, LoginTest, LogoutTest

# The password for the fixture data users is 'password'

__test__ = {
    'BASIC_TESTS': BASIC_TESTS,
    'TOKEN_GENERATOR_TESTS': TOKEN_GENERATOR_TESTS,
}
