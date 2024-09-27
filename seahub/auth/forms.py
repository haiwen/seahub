# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django import forms
from django.utils.translation import gettext_lazy as _
from django.utils.http import int_to_base36
from collections import OrderedDict

from seaserv import ccnet_api
from seahub.auth.models import SocialAuthUser
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2contact_email
from seahub.auth import authenticate
from seahub.auth.tokens import default_token_generator
from seahub.options.models import UserOptions
from seahub.profile.models import Profile
from seahub.utils import IS_EMAIL_CONFIGURED, send_html_email, \
    is_ldap_user, get_site_name
from seahub.auth.utils import get_virtual_id_by_email
from seahub.organizations.models import OrgAdminSettings, FORCE_ADFS_LOGIN

from captcha.fields import CaptchaField
from constance import config

from seahub.utils.password import get_password_strength_requirements, is_password_strength_valid


class AuthenticationForm(forms.Form):
    """
    Base class for authenticating users. Extend this to get a form that accepts
    username/password logins.
    """
    login = forms.CharField(label=_("Email or Username") )
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
        self.db_record = True
        super(AuthenticationForm, self).__init__(*args, **kwargs)

    def clean_login(self):
        return self.cleaned_data['login'].strip()

    def clean(self):
        username = self.cleaned_data.get('login')
        password = self.cleaned_data.get('password')
        
        if username and password:
            # First check the account length for validation.
            if len(username) > 255:
                self.errors['invalid_input'] = "The login name is too long."
                self.db_record = False
                raise forms.ValidationError("The login name is too long.")
            
            # Check user account active or not
            email = Profile.objects.convert_login_str_to_username(username)
            try:
                user = User.objects.get(email=email)
                if not user.is_active:
                    self.errors['inactive'] = _("This account is inactive.")
                    raise forms.ValidationError(_("This account is inactive."))
            except User.DoesNotExist:
                pass
            
            # Second check the password correct or not
            self.user_cache = authenticate(username=username, password=password)
            if self.user_cache is None:
                """then try login id/contact email/primary id"""
                # convert login id or contact email to username if any
                username = Profile.objects.convert_login_str_to_username(username)
                self.user_cache = authenticate(username=username, password=password)
                # After local user authentication process is completed, authenticate LDAP user
                if self.user_cache is None and settings.ENABLE_LDAP:
                    self.user_cache = authenticate(ldap_user=username, password=password)

                if self.user_cache is None:
                    err_msg = _("Please enter a correct email/username and password. Note that both fields are case-sensitive.")

                    if settings.LOGIN_ERROR_DETAILS:
                        try:
                            User.objects.get(email=username)
                        except User.DoesNotExist:
                            err_msg = _("That e-mail address doesn't have an associated user account. Are you sure you've registered?")
                            self.errors['not_found'] = err_msg

                    raise forms.ValidationError(err_msg)

            # user found for login string but inactive
            if not self.user_cache.is_active:
                if settings.ACTIVATE_AFTER_FIRST_LOGIN and \
                   not UserOptions.objects.is_user_logged_in(username):
                    """Activate user on first login."""
                    self.user_cache.is_active = True
                    self.user_cache.save()

                    UserOptions.objects.set_user_logged_in(username)
                else:
                    self.errors['inactive'] = _("This account is inactive.")
                    raise forms.ValidationError(_("This account is inactive."))

            # Non administrators can only log in with single sign on
            saml_provider_identifier = getattr(settings, 'SAML_PROVIDER_IDENTIFIER', 'saml')
            enable_adfs = getattr(settings, 'ENABLE_ADFS_LOGIN', False)
            enable_mul_adfs = getattr(settings, 'ENABLE_MULTI_ADFS', False)
            disable_pwd_login = False
            is_admin = False
            username = self.user_cache.username

            org_id = -1
            orgs = ccnet_api.get_orgs_by_user(username)
            if orgs:
                org_id = orgs[0].org_id
                
            if org_id > 0 and enable_mul_adfs:
                is_admin = ccnet_api.is_org_staff(org_id, username)
                org_settings = OrgAdminSettings.objects.filter(org_id=org_id, key=FORCE_ADFS_LOGIN).first()
                if org_settings:
                    disable_pwd_login = int(org_settings.value)
            elif enable_adfs:
                disable_pwd_login = settings.DISABLE_ADFS_USER_PWD_LOGIN
                is_admin = self.user_cache.is_staff

            if disable_pwd_login:
                if not is_admin:
                    adfs_user = SocialAuthUser.objects.filter(
                        username=username,
                        provider=saml_provider_identifier
                    )
                    if adfs_user.exists():
                        self.errors['disable_pwd_login'] = _('Please use Single Sign-On to login.')
                        raise forms.ValidationError(_('Please use Single Sign-On to login.'))

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
            raise forms.ValidationError(_('Failed to send email, email service is not properly configured, please contact administrator.'))

        email = self.cleaned_data["email"].lower().strip()
        vid = get_virtual_id_by_email(email)

        # TODO: add filter method to UserManager
        try:
            self.users_cache = User.objects.get(email=vid)
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
            site_name = get_site_name()
        else:
            site_name = domain_override

        contact_email = email2contact_email(user.username)
        c = {
            'email': contact_email,
            'uid': int_to_base36(user.id),
            'user': user,
            'token': token_generator.make_token(user),
        }

        send_html_email(_("Reset Password on %s") % site_name,
                        email_template_name, c, None,
                        [email2contact_email(user.username)])

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

            if is_password_strength_valid(pwd):
                return pwd
            else:
                password_strength_requirements = get_password_strength_requirements()
                raise forms.ValidationError(
                    _(("%(pwd_len)s characters or more, include "
                        "%(num_types)s types or more of these: "
                        "letters(case sensitive), numbers, and symbols")) %
                    {'pwd_len': password_strength_requirements.get('min_len'),
                        'num_types': len(password_strength_requirements.get('char_types'))})

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


field_order = ['old_password', 'new_password1', 'new_password2']
PasswordChangeForm.base_fields = OrderedDict((k, PasswordChangeForm.base_fields[k]) for k in field_order)


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


class SetContactEmailPasswordForm(SetPasswordForm):
    contact_email = forms.EmailField(label=_("Contact Email"), max_length=255)

    def clean_contact_email(self, ):
        username = Profile.objects.get_username_by_contact_email(self.cleaned_data['contact_email'])
        req_username = self.user.username
        if username is not None and username != req_username:
            raise forms.ValidationError(_('A user with this email already exists.'))
        return self.cleaned_data['contact_email']

    def save(self):
        super(SetContactEmailPasswordForm, self).save()

        contact_email = self.cleaned_data['contact_email']
        Profile.objects.update_contact_email(self.user.username, contact_email)
