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

from seahub.utils.password import get_password_strength_requirements, \
        is_password_strength_valid


class AuthenticationForm(forms.Form):
    """
    Base class for authenticating users. Extend this to get a form that accepts
    username/password logins.
    """
    login = forms.CharField(label=_("Email or Username"))
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
        login_str = self.cleaned_data.get('login')
        password = self.cleaned_data.get('password')

        if login_str and password:
            # First check the account length for validation.
            if len(login_str) > 255:
                self.errors['invalid_input'] = "The login string is too long."
                self.db_record = False
                raise forms.ValidationError("The login string is too long.")

            # converted_login_str can be either the internal user ID or 
            # the original login_str if there is no corresponding record in Profile
            converted_login_str = Profile.objects.convert_login_str_to_username(login_str)
            
            # Step 1) Check user account active or not
            try:
                user = User.objects.get(email=converted_login_str)
                if not user.is_active:
                    self.errors['inactive'] = _("This account is inactive.")
                    raise forms.ValidationError(_("This account is inactive."))
            except User.DoesNotExist:
                pass

            # Step 2) check the password correct or not using local account
            # converted_login_str can be either like xxxxxxxx@auth.local for new users
            # or a valid email address for old users created before v11.0
            self.user_cache = authenticate(username=converted_login_str, password=password)

            # Step 3) Check LDAP
            if self.user_cache is None:
                """then try login id/contact email/primary id"""
                # convert login id or contact email to username if any
                # After local user authentication process is completed, authenticate LDAP user
                if settings.ENABLE_LDAP and not settings.USE_LDAP_SYNC_ONLY:
                    self.user_cache = authenticate(ldap_user=converted_login_str, password=password)

                if self.user_cache is None:
                    err_msg = _("Please enter a correct email/username and password. Note that both fields are case-sensitive.")

                    if settings.LOGIN_ERROR_DETAILS:
                        try:
                            User.objects.get(email=converted_login_str)
                        except User.DoesNotExist:
                            err_msg = _("That e-mail address doesn't have an associated user account. Are you sure you've registered?")
                            self.errors['not_found'] = err_msg

                    raise forms.ValidationError(err_msg)

            username = self.user_cache.username
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
            org_id = -1
            orgs = ccnet_api.get_orgs_by_user(username)

            # check if user is admin
            if orgs:
                org_id = orgs[0].org_id
                is_admin = ccnet_api.is_org_staff(org_id, username)
            else:
                is_admin = self.user_cache.is_staff

            # get disable password login setting
            disable_pwd_login = settings.DISABLE_ADFS_USER_PWD_LOGIN
            enable_mul_adfs = getattr(settings, 'ENABLE_MULTI_ADFS', False)
            if org_id > 0 and enable_mul_adfs:
                org_settings = OrgAdminSettings.objects.filter(org_id=org_id,
                                                               key=FORCE_ADFS_LOGIN).first()
                if org_settings:
                    disable_pwd_login = int(org_settings.value)

            # get social provider identifier
            enable_adfs = getattr(settings, 'ENABLE_ADFS_LOGIN', False)
            enable_oauth = getattr(settings, 'ENABLE_OAUTH', False)
            provider_identifier = ''
            if enable_adfs or enable_mul_adfs:
                provider_identifier = getattr(settings,
                                              'SAML_PROVIDER_IDENTIFIER',
                                              'saml')
            elif enable_oauth:
                provider_identifier = getattr(settings,
                                              'OAUTH_PROVIDER_DOMAIN',
                                              '')

            # check if disable password login
            if disable_pwd_login and not is_admin and \
                    (enable_adfs or enable_mul_adfs or enable_oauth):
                social_user = SocialAuthUser.objects.filter(
                    username=username,
                    provider=provider_identifier
                )
                if social_user.exists():
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
        
        username = self.users_cache.username
        has_bind_social_auth = False
        if SocialAuthUser.objects.filter(username=username).exists():
            has_bind_social_auth = True

        can_reset_password = True
        if has_bind_social_auth and (not settings.ENABLE_SSO_USER_CHANGE_PASSWORD):
            can_reset_password = False
        if not can_reset_password:
            raise forms.ValidationError(_('Unable to reset password.'))

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
