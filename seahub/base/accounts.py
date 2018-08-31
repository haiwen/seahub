# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import re
import logging

from django import forms
from django.core.mail import send_mail
from django.utils import translation
from django.utils.translation import ugettext_lazy as _
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
import seaserv
from seaserv import ccnet_threaded_rpc, unset_repo_passwd, is_passwd_set, \
    seafile_api, ccnet_api
from constance import config
from registration import signals

from seahub.auth import login
from seahub.profile.models import Profile, DetailedProfile
from seahub.role_permissions.models import AdminRole
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role, \
        get_enabled_admin_role_permissions_by_role
from seahub.utils import is_user_password_strong, get_site_name, \
    clear_token, get_system_admins, is_pro_version, IS_EMAIL_CONFIGURED
from seahub.utils.mail import send_html_email_with_dj_template, MAIL_PRIORITY
from seahub.utils.licenseparse import user_number_over_limit
from seahub.share.models import ExtraSharePermission
from seahub.constants import DEFAULT_ADMIN

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

logger = logging.getLogger(__name__)

ANONYMOUS_EMAIL = 'Anonymous'

UNUSABLE_PASSWORD = '!' # This will never be a valid hash

class UserManager(object):

    def create_user(self, email, password=None, is_staff=False, is_active=False):
        """
        Creates and saves a User with given username and password.
        """
        # Lowercasing email address to avoid confusion.
        email = email.lower()

        user = User(email=email)
        user.is_staff = is_staff
        user.is_active = is_active
        user.set_password(password)
        user.save()

        return self.get(email=email)

    def update_role(self, email, role):
        """
        If user has a role, update it; or create a role for user.
        """
        ccnet_threaded_rpc.update_role_emailuser(email, role)
        return self.get(email=email)

    def create_superuser(self, email, password):
        u = self.create_user(email, password, is_staff=True, is_active=True)
        return u

    def get_superusers(self):
        """Return a list of admins.
        """
        emailusers = ccnet_threaded_rpc.get_superusers()

        user_list = []
        for e in emailusers:
            user = User(e.email)
            user.id = e.id
            user.is_staff = e.is_staff
            user.is_active = e.is_active
            user.ctime = e.ctime
            user_list.append(user)

        return user_list

    def get(self, email=None, id=None):
        if not email and not id:
            raise User.DoesNotExist, 'User matching query does not exits.'

        if email:
            emailuser = ccnet_threaded_rpc.get_emailuser(email)
        if id:
            emailuser = ccnet_threaded_rpc.get_emailuser_by_id(id)
        if not emailuser:
            raise User.DoesNotExist, 'User matching query does not exits.'

        user = User(emailuser.email)
        user.id = emailuser.id
        user.enc_password = emailuser.password
        user.is_staff = emailuser.is_staff
        user.is_active = emailuser.is_active
        user.ctime = emailuser.ctime
        user.org = emailuser.org
        user.source = emailuser.source
        user.role = emailuser.role
        user.reference_id = emailuser.reference_id

        if user.is_staff:
            try:
                role_obj = AdminRole.objects.get_admin_role(emailuser.email)
                admin_role = role_obj.role
            except AdminRole.DoesNotExist:
                admin_role = DEFAULT_ADMIN

            user.admin_role = admin_role
        else:
            user.admin_role = ''

        return user

class UserPermissions(object):
    def __init__(self, user):
        self.user = user

    def can_add_repo(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_add_repo']

    def can_add_group(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_add_group']

    def can_generate_share_link(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_generate_share_link']

    def can_generate_upload_link(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_generate_upload_link']

    def can_use_global_address_book(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_use_global_address_book']

    def can_view_org(self):
        if MULTI_TENANCY:
            return True if self.user.org is not None else False

        if CLOUD_MODE:
            return False

        return get_enabled_role_permissions_by_role(self.user.role)['can_view_org']

    def can_add_public_repo(self):
        """ Check if user can create public repo or share existed repo to public.

        Used when MULTI_TENANCY feature is NOT enabled.
        """

        if CLOUD_MODE:
            return False
        elif self.user.is_staff:
            return True
        elif get_enabled_role_permissions_by_role(self.user.role)['can_add_public_repo']:
            return True
        else:
            return bool(config.ENABLE_USER_CREATE_ORG_REPO)

    def can_drag_drop_folder_to_sync(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_drag_drop_folder_to_sync']

    def can_connect_with_android_clients(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_connect_with_android_clients']

    def can_connect_with_ios_clients(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_connect_with_ios_clients']

    def can_connect_with_desktop_clients(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_connect_with_desktop_clients']

    def can_invite_guest(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_invite_guest']

    def can_export_files_via_mobile_client(self):
        return get_enabled_role_permissions_by_role(self.user.role)['can_export_files_via_mobile_client']

    # Add default value for compatible issue when EMAILBE_ROLE_PERMISSIONS
    # is not updated with newly added permissions.
    def role_quota(self):
        return get_enabled_role_permissions_by_role(self.user.role).get('role_quota', '')

    def can_send_share_link_mail(self):

        if not IS_EMAIL_CONFIGURED:
            return False

        return get_enabled_role_permissions_by_role(self.user.role).get('can_send_share_link_mail', True)

    def storage_ids(self):
        return get_enabled_role_permissions_by_role(self.user.role).get('storage_ids', [])

class AdminPermissions(object):
    def __init__(self, user):
        self.user = user

    def can_view_system_info(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_view_system_info']

    def can_view_statistic(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_view_statistic']

    def can_config_system(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_config_system']

    def can_manage_library(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_manage_library']

    def can_manage_user(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_manage_user']

    def can_manage_group(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_manage_group']

    def can_view_user_log(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_view_user_log']

    def can_view_admin_log(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_view_admin_log']


class User(object):
    is_staff = False
    is_active = False
    is_superuser = False
    groups = []
    org = None
    objects = UserManager()

    class DoesNotExist(Exception):
        pass

    def __init__(self, email):
        self.username = email
        self.email = email
        self.permissions = UserPermissions(self)
        self.admin_permissions = AdminPermissions(self)

    def __unicode__(self):
        return self.username

    def is_anonymous(self):
        """
        Always returns False. This is a way of comparing User objects to
        anonymous users.
        """
        return False

    def is_authenticated(self):
        """
        Always return True. This is a way to tell if the user has been
        authenticated in templates.
        """
        return True

    def save(self):
        emailuser = ccnet_threaded_rpc.get_emailuser(self.username)
        if emailuser:
            if not hasattr(self, 'password'):
                self.set_unusable_password()

            if emailuser.source == "DB":
                source = "DB"
            else:
                source = "LDAP"

            if not self.is_active:
                # clear web api and repo sync token
                # when inactive an user
                try:
                    clear_token(self.username)
                except Exception as e:
                    logger.error(e)

            result_code = ccnet_threaded_rpc.update_emailuser(source,
                                                              emailuser.id,
                                                              self.password,
                                                              int(self.is_staff),
                                                              int(self.is_active))
        else:
            result_code = ccnet_threaded_rpc.add_emailuser(self.username,
                                                           self.password,
                                                           int(self.is_staff),
                                                           int(self.is_active))
        # -1 stands for failed; 0 stands for success
        return result_code

    def delete(self):
        """
        When delete user, we should also delete group relationships.
        """
        if self.source == "DB":
            source = "DB"
        else:
            source = "LDAP"

        username = self.username

        orgs = []
        if is_pro_version():
            orgs = ccnet_api.get_orgs_by_user(username)

        # remove owned repos
        owned_repos = []
        if orgs:
            for org in orgs:
                owned_repos += seafile_api.get_org_owned_repo_list(org.org_id,
                                                                   username)
        else:
            owned_repos += seafile_api.get_owned_repo_list(username)

        for r in owned_repos:
            seafile_api.remove_repo(r.id)

        # remove shared in repos
        shared_in_repos = []
        if orgs:
            for org in orgs:
                org_id = org.org_id
                shared_in_repos = seafile_api.get_org_share_in_repo_list(org_id,
                        username, -1, -1)

                for r in shared_in_repos:
                    seafile_api.org_remove_share(org_id,
                            r.repo_id, r.user, username)
        else:
            shared_in_repos = seafile_api.get_share_in_repo_list(username, -1, -1)
            for r in shared_in_repos:
                seafile_api.remove_share(r.repo_id, r.user, username)
        ExtraSharePermission.objects.filter(share_to=username).delete()

        # clear web api and repo sync token
        # when delete user
        try:
            clear_token(self.username)
        except Exception as e:
            logger.error(e)

        # remove current user from joined groups
        ccnet_api.remove_group_user(username)

        ccnet_api.remove_emailuser(source, username)
        signals.user_deleted.send(sender=self.__class__, username=username)

        Profile.objects.delete_profile_by_user(username)
        if config.ENABLE_TERMS_AND_CONDITIONS:
            from termsandconditions.models import UserTermsAndConditions
            UserTermsAndConditions.objects.filter(username=username).delete()
        self.delete_user_options(username)

    def get_username(self):
        return self.username

    def delete_user_options(self, username):
        """Remove user's all options.
        """
        from seahub.options.models import UserOptions
        UserOptions.objects.filter(email=username).delete()

    def get_and_delete_messages(self):
        messages = []
        return messages

    def set_password(self, raw_password):
        if raw_password is None:
            self.set_unusable_password()
        else:
            self.password = '%s' % raw_password

        # clear web api and repo sync token
        # when user password change
        try:
            clear_token(self.username)
        except Exception as e:
            logger.error(e)

    def check_password(self, raw_password):
        """
        Returns a boolean of whether the raw_password was correct. Handles
        encryption formats behind the scenes.
        """
        # Backwards-compatibility check. Older passwords won't include the
        # algorithm or salt.

        # if '$' not in self.password:
        #     is_correct = (self.password == \
        #                       get_hexdigest('sha1', '', raw_password))
        #     return is_correct
        return (ccnet_threaded_rpc.validate_emailuser(self.username, raw_password) == 0)

    def set_unusable_password(self):
        # Sets a value that will never be a valid hash
        self.password = UNUSABLE_PASSWORD

    def email_user(self, subject, message, from_email=None):
        "Sends an e-mail to this User."
        send_mail(subject, message, from_email, [self.email])

    def freeze_user(self, notify_admins=False):
        self.is_active = False
        self.save()

        if notify_admins:
            admins = get_system_admins()
            for u in admins:
                # save current language
                cur_language = translation.get_language()

                # get and active user language
                user_language = Profile.objects.get_user_language(u.email)
                translation.activate(user_language)

                send_html_email_with_dj_template(
                    u.email, dj_template='sysadmin/user_freeze_email.html',
                    subject=_('Account %(account)s froze on %(site)s.') % {
                        "account": self.email,
                        "site": get_site_name(),
                    },
                    context={'user': self.email},
                    priority=MAIL_PRIORITY.now
                )

                # restore current language
                translation.activate(cur_language)

    def remove_repo_passwds(self):
        """
        Remove all repo decryption passwords stored on server.
        """
        from seahub.utils import get_user_repos
        owned_repos, shared_repos, groups_repos, public_repos = get_user_repos(self.email)

        def has_repo(repos, repo):
            for r in repos:
                if repo.id == r.id:
                    return True
            return False

        passwd_setted_repos = []
        for r in owned_repos + shared_repos + groups_repos + public_repos:
            if not has_repo(passwd_setted_repos, r) and r.encrypted and \
                    is_passwd_set(r.id, self.email):
                passwd_setted_repos.append(r)

        for r in passwd_setted_repos:
            unset_repo_passwd(r.id, self.email)

    def remove_org_repo_passwds(self, org_id):
        """
        Remove all org repo decryption passwords stored on server.
        """
        from seahub.utils import get_user_repos
        owned_repos, shared_repos, groups_repos, public_repos = get_user_repos(self.email, org_id=org_id)

        def has_repo(repos, repo):
            for r in repos:
                if repo.id == r.id:
                    return True
            return False

        passwd_setted_repos = []
        for r in owned_repos + shared_repos + groups_repos + public_repos:
            if not has_repo(passwd_setted_repos, r) and r.encrypted and \
                    is_passwd_set(r.id, self.email):
                passwd_setted_repos.append(r)

        for r in passwd_setted_repos:
            unset_repo_passwd(r.id, self.email)

class AuthBackend(object):

    def get_user_with_import(self, username):
        emailuser = seaserv.get_emailuser_with_import(username)
        if not emailuser:
            raise User.DoesNotExist, 'User matching query does not exits.'

        user = User(emailuser.email)
        user.id = emailuser.id
        user.enc_password = emailuser.password
        user.is_staff = emailuser.is_staff
        user.is_active = emailuser.is_active
        user.ctime = emailuser.ctime
        user.org = emailuser.org
        user.source = emailuser.source
        user.role = emailuser.role

        if user.is_staff:
            try:
                role_obj = AdminRole.objects.get_admin_role(emailuser.email)
                admin_role = role_obj.role
            except AdminRole.DoesNotExist:
                admin_role = DEFAULT_ADMIN

            user.admin_role = admin_role
        else:
            user.admin_role = ''

        return user

    def get_user(self, username):
        try:
            user = self.get_user_with_import(username)
        except User.DoesNotExist:
            user = None
        return user

    def authenticate(self, username=None, password=None):
        user = self.get_user(username)
        if not user:
            return None

        if user.check_password(password):
            return user

########## Register related
class RegistrationBackend(object):
    """
    A registration backend which follows a simple workflow:

    1. User signs up, inactive account is created.

    2. Email is sent to user with activation link.

    3. User clicks activation link, account is now active.

    Using this backend requires that

    * ``registration`` be listed in the ``INSTALLED_APPS`` setting
      (since this backend makes use of models defined in this
      application).

    * The setting ``ACCOUNT_ACTIVATION_DAYS`` be supplied, specifying
      (as an integer) the number of days from registration during
      which a user may activate their account (after that period
      expires, activation will be disallowed).

    * The creation of the templates
      ``registration/activation_email_subject.txt`` and
      ``registration/activation_email.txt``, which will be used for
      the activation email. See the notes for this backends
      ``register`` method for details regarding these templates.

    Additionally, registration can be temporarily closed by adding the
    setting ``REGISTRATION_OPEN`` and setting it to
    ``False``. Omitting this setting, or setting it to ``True``, will
    be interpreted as meaning that registration is currently open and
    permitted.

    Internally, this is accomplished via storing an activation key in
    an instance of ``registration.models.RegistrationProfile``. See
    that model and its custom manager for full documentation of its
    fields and supported operations.

    """
    def register(self, request, **kwargs):
        """
        Given a username, email address and password, register a new
        user account, which will initially be inactive.

        Along with the new ``User`` object, a new
        ``registration.models.RegistrationProfile`` will be created,
        tied to that ``User``, containing the activation key which
        will be used for this account.

        An email will be sent to the supplied email address; this
        email should contain an activation link. The email will be
        rendered using two templates. See the documentation for
        ``RegistrationProfile.send_activation_email()`` for
        information about these templates and the contexts provided to
        them.

        After the ``User`` and ``RegistrationProfile`` are created and
        the activation email is sent, the signal
        ``registration.signals.user_registered`` will be sent, with
        the new ``User`` as the keyword argument ``user`` and the
        class of this backend as the sender.

        """
        email, password = kwargs['email'], kwargs['password1']
        username = email
        site = get_current_site(request)

        from registration.models import RegistrationProfile
        if bool(config.ACTIVATE_AFTER_REGISTRATION) is True:
            # since user will be activated after registration,
            # so we will not use email sending, just create acitvated user
            new_user = RegistrationProfile.objects.create_active_user(username, email,
                                                                        password, site,
                                                                        send_email=False)
            # login the user
            new_user.backend=settings.AUTHENTICATION_BACKENDS[0]

            login(request, new_user)
        else:
            # create inactive user, user can be activated by admin, or through activated email
            new_user = RegistrationProfile.objects.create_inactive_user(username, email,
                                                                        password, site,
                                                                        send_email=config.REGISTRATION_SEND_MAIL)

        # userid = kwargs['userid']
        # if userid:
        #     ccnet_threaded_rpc.add_binding(new_user.username, userid)

        if settings.REQUIRE_DETAIL_ON_REGISTRATION:
            name = kwargs.get('name', '')
            department = kwargs.get('department', '')
            telephone = kwargs.get('telephone', '')
            note = kwargs.get('note', '')
            Profile.objects.add_or_update(new_user.username, name, note)
            DetailedProfile.objects.add_detailed_profile(new_user.username,
                                                         department,
                                                         telephone)

        signals.user_registered.send(sender=self.__class__,
                                     user=new_user,
                                     request=request)
        return new_user

    def activate(self, request, activation_key):
        """
        Given an an activation key, look up and activate the user
        account corresponding to that key (if possible).

        After successful activation, the signal
        ``registration.signals.user_activated`` will be sent, with the
        newly activated ``User`` as the keyword argument ``user`` and
        the class of this backend as the sender.

        """
        from registration.models import RegistrationProfile
        activated = RegistrationProfile.objects.activate_user(activation_key)
        if activated:
            signals.user_activated.send(sender=self.__class__,
                                        user=activated,
                                        request=request)
            # login the user
            activated.backend=settings.AUTHENTICATION_BACKENDS[0]
            login(request, activated)

        return activated

    def registration_allowed(self, request):
        """
        Indicate whether account registration is currently permitted,
        based on the value of the setting ``REGISTRATION_OPEN``. This
        is determined as follows:

        * If ``REGISTRATION_OPEN`` is not specified in settings, or is
          set to ``True``, registration is permitted.

        * If ``REGISTRATION_OPEN`` is both specified and set to
          ``False``, registration is not permitted.

        """
        return getattr(settings, 'REGISTRATION_OPEN', True)

    def get_form_class(self, request):
        """
        Return the default form class used for user registration.

        """
        return RegistrationForm

    def post_registration_redirect(self, request, user):
        """
        Return the name of the URL to redirect to after successful
        user registration.

        """
        return ('registration_complete', (), {})

    def post_activation_redirect(self, request, user):
        """
        Return the name of the URL to redirect to after successful
        account activation.

        """
        return ('libraries', (), {})


class RegistrationForm(forms.Form):
    """
    Form for registering a new user account.

    Validates that the requested email is not already in use, and
    requires the password to be entered twice to catch typos.
    """
    attrs_dict = { 'class': 'input' }

    email = forms.CharField(widget=forms.TextInput(attrs=dict(attrs_dict,
                                                               maxlength=75)),
                             label=_("Email address"))
    userid = forms.RegexField(regex=r'^\w+$',
                              max_length=40,
                              required=False,
                              widget=forms.TextInput(),
                              label=_("Username"),
                              error_messages={ 'invalid': _("This value must be of length 40") })

    password1 = forms.CharField(widget=forms.PasswordInput(attrs=attrs_dict, render_value=False),
                                label=_("Password"))
    password2 = forms.CharField(widget=forms.PasswordInput(attrs=attrs_dict, render_value=False),
                                label=_("Password (again)"))

    @classmethod
    def allow_register(self, email):
        prog = re.compile(r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)",
                          re.IGNORECASE)
        return False if prog.match(email) is None else True

    def clean_email(self):
        if user_number_over_limit():
            raise forms.ValidationError(_("The number of users exceeds the limit."))

        email = self.cleaned_data['email']
        if not self.allow_register(email):
            raise forms.ValidationError(_("Enter a valid email address."))

        emailuser = ccnet_threaded_rpc.get_emailuser(email)
        if not emailuser:
            return self.cleaned_data['email']
        else:
            raise forms.ValidationError(_("User %s already exists.") % email)

    def clean_userid(self):
        if self.cleaned_data['userid'] and len(self.cleaned_data['userid']) != 40:
            raise forms.ValidationError(_("Invalid user id."))
        return self.cleaned_data['userid']

    def clean_password1(self):
        if 'password1' in self.cleaned_data:
            pwd = self.cleaned_data['password1']

            if bool(config.USER_STRONG_PASSWORD_REQUIRED) is True:
                if bool(is_user_password_strong(pwd)) is True:
                    return pwd
                else:
                    raise forms.ValidationError(
                        _(("%(pwd_len)s characters or more, include "
                           "%(num_types)s types or more of these: "
                           "letters(case sensitive), numbers, and symbols")) %
                        {'pwd_len': config.USER_PASSWORD_MIN_LENGTH,
                         'num_types': config.USER_PASSWORD_STRENGTH_LEVEL})
            else:
                return pwd

    def clean_password2(self):
        """
        Verifiy that the values entered into the two password fields
        match. Note that an error here will end up in
        ``non_field_errors()`` because it doesn't apply to a single
        field.

        """
        if 'password1' in self.cleaned_data and 'password2' in self.cleaned_data:
            if self.cleaned_data['password1'] != self.cleaned_data['password2']:
                raise forms.ValidationError(_("The two password fields didn't match."))
        return self.cleaned_data

class DetailedRegistrationForm(RegistrationForm):
    attrs_dict = { 'class': 'input' }

    try:
        from seahub.settings import REGISTRATION_DETAILS_MAP
    except:
        REGISTRATION_DETAILS_MAP = None

    if REGISTRATION_DETAILS_MAP:
        name_required = REGISTRATION_DETAILS_MAP.get('name', False)
        dept_required = REGISTRATION_DETAILS_MAP.get('department', False)
        tele_required = REGISTRATION_DETAILS_MAP.get('telephone', False)
        note_required = REGISTRATION_DETAILS_MAP.get('note', False)
    else:
        # Backward compatible
        name_required = dept_required = tele_required = note_required = True

    name = forms.CharField(widget=forms.TextInput(
            attrs=dict(attrs_dict, maxlength=64)), label=_("name"),
                           required=name_required)
    department = forms.CharField(widget=forms.TextInput(
            attrs=dict(attrs_dict, maxlength=512)), label=_("department"),
                                 required=dept_required)
    telephone = forms.CharField(widget=forms.TextInput(
            attrs=dict(attrs_dict, maxlength=100)), label=_("telephone"),
                                required=tele_required)
    note = forms.CharField(widget=forms.TextInput(
            attrs=dict(attrs_dict, maxlength=100)), label=_("note"),
                           required=note_required)
