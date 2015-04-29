from django.contrib.sites.models import Site
from django import forms
from django.utils.translation import ugettext_lazy as _
from django.utils.http import int_to_base36

from seahub.base.accounts import User
from seahub.auth import authenticate
from seahub.auth.tokens import default_token_generator
from seahub.utils import IS_EMAIL_CONFIGURED, send_html_email, \
    is_valid_username, is_ldap_user, is_user_password_strong, clear_token

from captcha.fields import CaptchaField

from seahub.settings import USER_STRONG_PASSWORD_REQUIRED, \
    USER_PASSWORD_STRENGTH_LEVEL, USER_PASSWORD_MIN_LENGTH

class AuthenticationForm(forms.Form):
    """
    Base class for authenticating users. Extend this to get a form that accepts
    username/password logins.
    """
    username = forms.CharField(label=_("Username"), max_length=255)
    password = forms.CharField(label=_("Password"), widget=forms.PasswordInput)

    def __init__(self, request=None, *args, **kwargs):
        """
        If request is passed in, the form will validate that cookies are
        enabled. Note that the request (a HttpRequest object) must have set a
        cookie with the key TEST_COOKIE_NAME and value TEST_COOKIE_VALUE before
        running this validation.
        """
        self.request = request
        self.user_cache = None
        super(AuthenticationForm, self).__init__(*args, **kwargs)

    def clean_username(self):
        username = self.cleaned_data['username']
        if not is_valid_username(username):
            raise forms.ValidationError(_("Enter a valid email address."))
        return self.cleaned_data['username']

    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')

        if username and password:
            self.user_cache = authenticate(username=username, password=password)
            if self.user_cache is None:
                raise forms.ValidationError(_("Please enter a correct username and password. Note that both fields are case-sensitive."))
            elif not self.user_cache.is_active:
                raise forms.ValidationError(_("This account is inactive."))

        # TODO: determine whether this should move to its own method.
        if self.request:
            if not self.request.session.test_cookie_worked():
                raise forms.ValidationError(_("Your Web browser doesn't appear to have cookies enabled. Cookies are required for logging in."))

        return self.cleaned_data

    def get_user_id(self):
        if self.user_cache:
            return self.user_cache.id
        return None

    def get_user(self):
        return self.user_cache

class CaptchaAuthenticationForm(AuthenticationForm):
    captcha = CaptchaField()

class PasswordResetForm(forms.Form):
    email = forms.EmailField(label=_("E-mail"), max_length=255)

    def clean_email(self):
        """
        Validates that a user exists with the given e-mail address.
        """
        if not IS_EMAIL_CONFIGURED:
            raise forms.ValidationError(_(u'Failed to send email, email service is not properly configured, please contact administrator.'))

        email = self.cleaned_data["email"].lower().strip()

        # TODO: add filter method to UserManager
        try:
            self.users_cache = User.objects.get(email=email)
        except User.DoesNotExist:
            raise forms.ValidationError(_("That e-mail address doesn't have an associated user account. Are you sure you've registered?"))

        if is_ldap_user(self.users_cache):
            raise forms.ValidationError(_("Can not reset password, please contact LDAP admin."))

        return email

    def save(self, domain_override=None, email_template_name='registration/password_reset_email.html',
             use_https=False, token_generator=default_token_generator):
        """
        Generates a one-use only link for resetting password and sends to the user
        """

        user = self.users_cache
        if not domain_override:
            current_site = Site.objects.get_current()
            site_name = current_site.name
        else:
            site_name = domain_override

        c = {
            'email': user.username,
            'uid': int_to_base36(user.id),
            'user': user,
            'token': token_generator.make_token(user),
        }

        send_html_email(_("Reset Password on %s") % site_name,
                  email_template_name, c, None, [user.username])

class SetPasswordForm(forms.Form):
    """
    A form that lets a user change set his/her password without
    entering the old password
    """
    new_password1 = forms.CharField(label=_("New password"), widget=forms.PasswordInput)
    new_password2 = forms.CharField(label=_("New password confirmation"), widget=forms.PasswordInput)

    def __init__(self, user, *args, **kwargs):
        self.user = user

        super(SetPasswordForm, self).__init__(*args, **kwargs)

    def clean_new_password1(self):
        if 'new_password1' in self.cleaned_data:
            pwd = self.cleaned_data['new_password1']

            if USER_STRONG_PASSWORD_REQUIRED is True:
                if is_user_password_strong(pwd) is True:
                    return pwd
                else:
                    raise forms.ValidationError(
                        _(("%(pwd_len)s characters or more, include "
                           "%(num_types)s types or more of these: "
                           "letters(case sensitive), numbers, and symbols")) %
                        {'pwd_len': USER_PASSWORD_MIN_LENGTH,
                         'num_types': USER_PASSWORD_STRENGTH_LEVEL})
            else:
                return pwd

    def clean_new_password2(self):
        password1 = self.cleaned_data.get('new_password1')
        password2 = self.cleaned_data.get('new_password2')
        if password1 and password2:
            if password1 != password2:
                raise forms.ValidationError(_("The two password fields didn't match."))
        return password2

    def save(self, commit=True):
        self.user.set_password(self.cleaned_data['new_password1'])
        if commit:
            self.user.save()
        clear_token(self.user.username)
        return self.user

class PasswordChangeForm(SetPasswordForm):
    """
    A form that lets a user change his/her password by entering
    their old password.
    """
    old_password = forms.CharField(label=_("Old password"), widget=forms.PasswordInput)

    def clean_old_password(self):
        """
        Validates that the old_password field is correct.
        """
        old_password = self.cleaned_data["old_password"]
        if not self.user.check_password(old_password):
            raise forms.ValidationError(_("Your old password was entered incorrectly. Please enter it again."))
        return old_password
PasswordChangeForm.base_fields.keyOrder = ['old_password', 'new_password1', 'new_password2']

class AdminPasswordChangeForm(forms.Form):
    """
    A form used to change the password of a user in the admin interface.
    """
    password1 = forms.CharField(label=_("Password"), widget=forms.PasswordInput)
    password2 = forms.CharField(label=_("Password (again)"), widget=forms.PasswordInput)

    def __init__(self, user, *args, **kwargs):
        self.user = user
        super(AdminPasswordChangeForm, self).__init__(*args, **kwargs)

    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2:
            if password1 != password2:
                raise forms.ValidationError(_("The two password fields didn't match."))
        return password2

    def save(self, commit=True):
        """
        Saves the new password.
        """
        self.user.set_password(self.cleaned_data["password1"])
        if commit:
            self.user.save()
        return self.user
