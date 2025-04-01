# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import os
import sys
import re
import logging

from django import forms
from django.core.mail import send_mail
from django.utils import translation
from django.utils.encoding import smart_str
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from seaserv import ccnet_threaded_rpc, unset_repo_passwd, \
    seafile_api, ccnet_api
from constance import config
from registration import signals
import ldap
from ldap import sasl
from ldap import filter

from seahub.auth import login
from seahub.auth.utils import get_virtual_id_by_email
from seahub.constants import DEFAULT_USER, DEFAULT_ORG, DEFAULT_ADMIN
from seahub.profile.models import Profile, DetailedProfile
from seahub.role_permissions.models import AdminRole
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role, \
        get_enabled_admin_role_permissions_by_role
from seahub.utils import get_site_name, \
    clear_token, get_system_admins, is_pro_version, IS_EMAIL_CONFIGURED
from seahub.utils.mail import send_html_email_with_dj_template
from seahub.utils.licenseparse import user_number_over_limit
from seahub.share.models import ExtraSharePermission, FileShare, UploadLinkShare
from seahub.utils.auth import gen_user_virtual_id
from seahub.auth.models import SocialAuthUser
from seahub.repo_auto_delete.models import RepoAutoDelete
from seahub.utils.password import get_password_strength_requirements, is_password_strength_valid

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

from seahub.utils.ldap import ENABLE_LDAP, LDAP_USER_FIRST_NAME_ATTR, LDAP_USER_LAST_NAME_ATTR, \
    LDAP_USER_NAME_REVERSE, LDAP_FILTER, LDAP_CONTACT_EMAIL_ATTR, LDAP_USER_ROLE_ATTR, \
    ENABLE_SASL, SASL_MECHANISM, SASL_AUTHC_ID_ATTR, \
    LDAP_PROVIDER, LDAP_SERVER_URL, LDAP_BASE_DN, LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD, LDAP_LOGIN_ATTR, \
    ENABLE_MULTI_LDAP, MULTI_LDAP_1_SERVER_URL, MULTI_LDAP_1_BASE_DN, MULTI_LDAP_1_ADMIN_DN, \
    MULTI_LDAP_1_ADMIN_PASSWORD, MULTI_LDAP_1_LOGIN_ATTR, \
    MULTI_LDAP_1_PROVIDER, MULTI_LDAP_1_FILTER, MULTI_LDAP_1_CONTACT_EMAIL_ATTR, \
    MULTI_LDAP_1_USER_ROLE_ATTR, MULTI_LDAP_1_ENABLE_SASL, MULTI_LDAP_1_SASL_MECHANISM, \
    MULTI_LDAP_1_SASL_AUTHC_ID_ATTR, LDAP_UPDATE_USER_WHEN_LOGIN, \
    LDAP_FOLLOW_REFERRALS, MULTI_LDAP_1_FOLLOW_REFERRALS

logger = logging.getLogger(__name__)

ANONYMOUS_EMAIL = 'Anonymous'

UNUSABLE_PASSWORD = '!'  # This will never be a valid hash


def default_ldap_role_mapping(role):
    return role


def default_ldap_role_list_mapping(role_list):
    return role_list[0] if role_list else ''


ldap_role_mapping = default_ldap_role_mapping
ldap_role_list_mapping = default_ldap_role_list_mapping
USE_LDAP_ROLE_LIST_MAPPING = False

if ENABLE_LDAP:
    current_path = os.path.dirname(os.path.abspath(__file__))
    conf_dir = os.path.join(current_path, '../../../../conf')
    sys.path.append(conf_dir)
    try:
        from seahub_custom_functions import ldap_role_mapping
        ldap_role_mapping = ldap_role_mapping
    except Exception:
        pass
    try:
        from seahub_custom_functions import ldap_role_list_mapping
        ldap_role_list_mapping = ldap_role_list_mapping
        USE_LDAP_ROLE_LIST_MAPPING = True
    except Exception:
        pass


class UserManager(object):

    def create_user(self, email, password=None, is_staff=False, is_active=False):
        """
        Creates and saves a User with given username and password.
        """
        virtual_id = gen_user_virtual_id()

        # Lowercasing email address to avoid confusion.
        email = email.lower()

        user = User(email=virtual_id)
        user.is_staff = is_staff
        user.is_active = is_active
        user.set_password(password)
        user.save()

        # Set email as contact email.
        Profile.objects.add_or_update(username=virtual_id, contact_email=email)

        return self.get(email=virtual_id)

    def update_role(self, email, role, is_manual_set=True):
        """
        If user has a role, update it; or create a role for user.
        """
        ccnet_api.update_role_emailuser(email, role, is_manual_set=is_manual_set)
        return self.get(email=email)

    def create_oauth_user(self, email=None, password=None, is_staff=False, is_active=False):
        """
        Creates and saves an oauth user which can without email.
        """
        virtual_id = gen_user_virtual_id()

        user = User(email=virtual_id)
        user.is_staff = is_staff
        user.is_active = is_active
        user.set_password(password)
        user.save()

        # Set email as contact email.
        if email:
            email = email.lower()
        Profile.objects.add_or_update(username=virtual_id, contact_email=email)

        return self.get(email=virtual_id)

    def create_ldap_user(self, email=None, password=None, nickname=None, is_staff=False, is_active=False):
        """
        Creates and saves a ldap user which can without email.
        """
        virtual_id = gen_user_virtual_id()

        user = User(email=virtual_id)
        user.is_staff = is_staff
        user.is_active = is_active
        user.set_password(password)
        user.save()

        # Set email as contact email.
        if email:
            email = email.lower()
        Profile.objects.add_or_update(username=virtual_id, contact_email=email, nickname=nickname)

        return self.get(email=virtual_id)

    def create_saml_user(self, email=None, password=None, nickname=None, is_staff=False, is_active=False):
        """
        Creates and saves a saml user which can without email.
        """
        virtual_id = gen_user_virtual_id()

        user = User(email=virtual_id)
        user.is_staff = is_staff
        user.is_active = is_active
        user.set_password(password)
        user.save()

        # Set email as contact email.
        if email:
            email = email.lower()
        Profile.objects.add_or_update(username=virtual_id, contact_email=email, nickname=nickname)

        return self.get(email=virtual_id)

    def create_remote_user(self, email, password=None, is_staff=False, is_active=False):
        """
        Creates and saves a remote user with given username.
        """
        user = User(email=email)
        user.is_staff = is_staff
        user.is_active = is_active
        user.set_password(password)
        user.save()

        return self.get(email=email)

    def create_cas_user(self, password=None, is_staff=False, is_active=False):
        """
        Creates and saves a CAS user with given username.
        """
        virtual_id = gen_user_virtual_id()

        user = User(email=virtual_id)
        user.is_staff = is_staff
        user.is_active = is_active
        user.set_password(password)
        user.save()

        return self.get(email=virtual_id)

    def create_krb_user(self, email, password=None, is_staff=False, is_active=False):
        """
        Creates and saves a KRB5 user with given username.
        """
        user = User(email=email)
        user.is_staff = is_staff
        user.is_active = is_active
        user.set_password(password)
        user.save()

        return self.get(email=email)

    def create_shib_user(self, is_staff=False, is_active=False):
        """
        Creates and saves a SHIB user with given username.
        """
        virtual_id = gen_user_virtual_id()

        user = User(email=virtual_id)
        user.is_staff = is_staff
        user.is_active = is_active
        user.set_unusable_password()
        user.save()

        return self.get(email=virtual_id)

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
            raise User.DoesNotExist('User matching query does not exits.')

        if email:
            emailuser = ccnet_threaded_rpc.get_emailuser(email)
        if id:
            emailuser = ccnet_threaded_rpc.get_emailuser_by_id(id)
        if not emailuser:
            raise User.DoesNotExist('User matching query does not exits.')

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

    def get_old_user(self, email, provider, uid):
        if not email:
            raise User.DoesNotExist('User matching query does not exits.')

        emailuser = ccnet_threaded_rpc.get_emailuser(email)
        if not emailuser:
            raise User.DoesNotExist('User matching query does not exits.')

        try:
            SocialAuthUser.objects.add(emailuser.email, provider, uid)
        except Exception as e:
            logger.error(e)

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


class UserPermissions(object):
    def __init__(self, user):
        self.user = user

    def _get_user_role(self):
        org_role = self.user.org_role
        if org_role is None:
            return self.user.role

        if self.user.role == '' or self.user.role == DEFAULT_USER:
            if org_role == DEFAULT_ORG:
                return DEFAULT_USER
            else:
                return org_role
        else:
            return self.user.role

    def _get_perm_by_roles(self, perm_name):
        role = self._get_user_role()
        return get_enabled_role_permissions_by_role(role)[perm_name]

    def can_add_repo(self):
        return self._get_perm_by_roles('can_add_repo')

    def can_share_repo(self):
        return self._get_perm_by_roles('can_share_repo')

    def can_add_group(self):
        return self._get_perm_by_roles('can_add_group')

    def can_generate_share_link(self):
        return self._get_perm_by_roles('can_generate_share_link')

    def can_generate_upload_link(self):
        return self._get_perm_by_roles('can_generate_upload_link')

    def can_use_global_address_book(self):
        return self._get_perm_by_roles('can_use_global_address_book')

    def can_view_org(self):
        if MULTI_TENANCY:
            return True if self.user.org is not None else False

        if CLOUD_MODE:
            return False

        return self._get_perm_by_roles('can_view_org')

    def can_add_public_repo(self):
        """ Check if user can create public repo or share existed repo to public.

        Used when MULTI_TENANCY feature is NOT enabled.
        """

        if CLOUD_MODE:
            if MULTI_TENANCY:
                return True
            else:
                return False
        elif self.user.is_staff:
            return True
        elif self._get_perm_by_roles('can_add_public_repo'):
            return True
        else:
            return False

    def can_drag_drop_folder_to_sync(self):
        return self._get_perm_by_roles('can_drag_drop_folder_to_sync')

    def can_connect_with_android_clients(self):
        return self._get_perm_by_roles('can_connect_with_android_clients')

    def can_connect_with_ios_clients(self):
        return self._get_perm_by_roles('can_connect_with_ios_clients')

    def can_connect_with_desktop_clients(self):
        return self._get_perm_by_roles('can_connect_with_desktop_clients')

    def can_invite_guest(self):
        return self._get_perm_by_roles('can_invite_guest')

    def can_export_files_via_mobile_client(self):
        return self._get_perm_by_roles('can_export_files_via_mobile_client')

    def role_quota(self):
        return self._get_perm_by_roles('role_quota')

    def can_send_share_link_mail(self):
        if not IS_EMAIL_CONFIGURED:
            return False

        return self._get_perm_by_roles('can_send_share_link_mail')

    def storage_ids(self):
        return self._get_perm_by_roles('storage_ids')

    def can_create_wiki(self):
        if not settings.ENABLE_WIKI:
            return False

        return self._get_perm_by_roles('can_create_wiki')

    def can_publish_wiki(self):
        if not settings.ENABLE_WIKI:
            return False
        return self._get_perm_by_roles('can_publish_wiki')

    def can_choose_office_suite(self):
        if not settings.ENABLE_MULTIPLE_OFFICE_SUITE:
            return False
        return self._get_perm_by_roles('can_choose_office_suite')


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

    def can_update_user(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_update_user']

    def can_manage_group(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_manage_group']

    def can_view_user_log(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_view_user_log']

    def can_view_admin_log(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['can_view_admin_log']

    def other_permission(self):
        return get_enabled_admin_role_permissions_by_role(self.user.admin_role)['other_permission']


class User(object):
    is_staff = False
    is_active = False
    is_superuser = False
    groups = []
    org = None
    objects = UserManager()

    @property
    def org_role(self):
        if not MULTI_TENANCY:
            return None

        if not hasattr(self, '_cached_orgs'):
            self._cached_orgs = ccnet_api.get_orgs_by_user(self.username)

        if not self._cached_orgs:
            return None

        if not hasattr(self, '_cached_org_role'):
            from seahub.organizations.models import OrgSettings
            self._cached_org_role = OrgSettings.objects.get_role_by_org(
                self._cached_orgs[0])

        return self._cached_org_role

    @property
    def contact_email(self):
        if not hasattr(self, '_cached_contact_email'):
            self._cached_contact_email = email2contact_email(self.username)

        return self._cached_contact_email

    @property
    def name(self):
        if not hasattr(self, '_cached_nickname'):
            # convert raw string to unicode obj
            self._cached_nickname = smart_str(email2nickname(self.username))

        return self._cached_nickname

    class DoesNotExist(Exception):
        pass

    def __init__(self, email):
        self.username = email
        self.email = email
        self.permissions = UserPermissions(self)
        self.admin_permissions = AdminPermissions(self)

        self.password_changed = False

    def __unicode__(self):
        return self.username

    @property
    def is_anonymous(self):
        """
        Always returns False. This is a way of comparing User objects to
        anonymous users.
        """
        return False

    @property
    def is_authenticated(self):
        """
        Always return True. This is a way to tell if the user has been
        authenticated in templates.
        """
        return True

    def save(self):
        emailuser = ccnet_api.get_emailuser(self.username)
        if emailuser and emailuser.source.lower() in ("db", "ldapimport"):
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

            if self.password_changed:
                emailuser = ccnet_threaded_rpc.get_emailuser(self.username)
                self.enc_password = emailuser.password
                self.password_changed = False
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

        RepoAutoDelete.objects.filter(repo_id__in=[r.id for r in owned_repos]).delete()

        # remove shared in repos
        shared_in_repos = []
        if orgs:
            for org in orgs:
                org_id = org.org_id
                shared_in_repos = seafile_api.get_org_share_in_repo_list(org_id, username, -1, -1)

                for r in shared_in_repos:
                    seafile_api.org_remove_share(org_id, r.repo_id, r.user, username)
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

        # clear share links
        FileShare.objects.filter(username=username).delete()
        UploadLinkShare.objects.filter(username=username).delete()

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

        self.password_changed = True
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
        return (ccnet_threaded_rpc.validate_emailuser(self.username, raw_password) == 0)

    def set_unusable_password(self):
        # Sets a value that will never be a valid hash
        self.password = UNUSABLE_PASSWORD

    def email_user(self, subject, message, from_email=None):
        "Sends an e-mail to this User."
        send_mail(subject, message, from_email, [self.email])

    def freeze_user(self, notify_admins=False, notify_org_admins=False):
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

                send_html_email_with_dj_template(email2contact_email(u.email),
                                                 subject=_('Account %(account)s froze on %(site)s.') % {
                                                     "account": email2contact_email(self.email),
                                                     "site": get_site_name()},
                                                 dj_template='sysadmin/user_freeze_email.html',
                                                 context={'user': email2contact_email(self.email)})

                # restore current language
                translation.activate(cur_language)

        if notify_org_admins:
            org = None
            if is_pro_version():
                orgs = ccnet_api.get_orgs_by_user(self.username)
                if orgs:
                    org = orgs[0]

            org_members = list()
            if org:
                org_members = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
            for u in org_members:
                if not (ccnet_api.is_org_staff(org.org_id, u.email) == 1):
                    continue

                # save current language
                cur_language = translation.get_language()

                # get and active user language
                user_language = Profile.objects.get_user_language(u.email)
                translation.activate(user_language)

                send_html_email_with_dj_template(email2contact_email(u.email),
                                                 subject=_('Account %(account)s froze on %(site)s.') % {
                                                     "account": email2contact_email(self.email),
                                                     "site": get_site_name()},
                                                 dj_template='sysadmin/user_freeze_email.html',
                                                 context={'user': email2contact_email(self.email)})

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
                    seafile_api.is_password_set(r.id, self.email):
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
                    seafile_api.is_password_set(r.id, self.email):
                passwd_setted_repos.append(r)

        for r in passwd_setted_repos:
            unset_repo_passwd(r.id, self.email)


class AuthBackend(object):

    def get_user_with_import(self, username):
        emailuser = ccnet_api.get_emailuser_with_import(username)
        if not emailuser:
            raise User.DoesNotExist('User matching query does not exits.')

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


def parse_ldap_res(ldap_search_result, enable_sasl, sasl_mechanism, sasl_authc_id_attr, contact_email_attr, role_attr):
    first_name = ''
    last_name = ''
    contact_email = ''
    user_role = ''
    authc_id = ''
    dn = ldap_search_result[0][0]
    first_name_list = ldap_search_result[0][1].get(LDAP_USER_FIRST_NAME_ATTR, [])
    last_name_list = ldap_search_result[0][1].get(LDAP_USER_LAST_NAME_ATTR, [])
    contact_email_list = ldap_search_result[0][1].get(contact_email_attr, [])
    user_role_list = ldap_search_result[0][1].get(role_attr, [])
    authc_id_list = list()
    if enable_sasl and sasl_mechanism:
        authc_id_list = ldap_search_result[0][1].get(sasl_authc_id_attr, [])

    if first_name_list:
        first_name = first_name_list[0].decode()
    if last_name_list:
        last_name = last_name_list[0].decode()

    if LDAP_USER_NAME_REVERSE:
        nickname = last_name + ' ' + first_name
    else:
        nickname = first_name + ' ' + last_name

    if contact_email_list:
        contact_email = contact_email_list[0].decode()

    if user_role_list:
        if not USE_LDAP_ROLE_LIST_MAPPING:
            role = user_role_list[0].decode()
            user_role = ldap_role_mapping(role)
        else:
            role_list = [role.decode() for role in user_role_list]
            user_role = ldap_role_list_mapping(role_list)

    if authc_id_list:
        authc_id = authc_id_list[0].decode()

    return dn, nickname, contact_email, user_role, authc_id


class CustomLDAPBackend(object):
    """ A custom LDAP authentication backend """

    def get_user(self, username):
        try:
            user = User.objects.get(username)
        except User.DoesNotExist:
            user = None
        return user

    def ldap_bind(self, server_url, dn, authc_id, password, enable_sasl, sasl_mechanism, follow_referrals):
        bind_conn = ldap.initialize(server_url)

        try:
            bind_conn.set_option(ldap.OPT_REFERRALS, 1 if follow_referrals else 0)
        except Exception as e:
            raise Exception('Failed to set referrals option: %s' % e)

        try:
            bind_conn.protocol_version = ldap.VERSION3
            if enable_sasl and sasl_mechanism:
                sasl_cb_value_dict = {}
                if sasl_mechanism != 'EXTERNAL' and sasl_mechanism != 'GSSAPI':
                    sasl_cb_value_dict = {
                        sasl.CB_AUTHNAME: authc_id,
                        sasl.CB_PASS: password,
                    }
                sasl_auth = sasl.sasl(sasl_cb_value_dict, sasl_mechanism)
                bind_conn.sasl_interactive_bind_s('', sasl_auth)
            else:
                bind_conn.simple_bind_s(dn, password)
        except Exception as e:
            raise Exception('ldap bind failed: %s' % e)

        return bind_conn

    def search_user(self, server_url, admin_dn, admin_password, enable_sasl, sasl_mechanism,
                    sasl_authc_id_attr, base_dn, login_attr_conf, login_attr, password, serch_filter,
                    contact_email_attr, role_attr, follow_referrals):
        try:
            admin_bind = self.ldap_bind(server_url, admin_dn, admin_dn,
                                        admin_password, enable_sasl,
                                        sasl_mechanism, follow_referrals)
        except Exception as e:
            raise Exception(e)

        filterstr = filter.filter_format(f'(&({login_attr_conf}=%s))', [login_attr])
        if serch_filter:
            filterstr = filterstr[:-1] + '(' + serch_filter + '))'

        result_data = None
        base_list = base_dn.split(';')
        for base in base_list:
            if base == '':
                continue
            try:
                result_data = admin_bind.search_s(base, ldap.SCOPE_SUBTREE, filterstr)
                if result_data:
                    break
            except Exception as e:
                raise Exception('ldap user search failed: %s' % e)

        # user not found in ldap
        if not result_data:
            raise Exception('ldap user %s not found.' % login_attr)

        # delete old ldap bind_conn instance and create new, if not, some err will occur
        admin_bind.unbind_s()
        del admin_bind

        try:
            dn, nickname, contact_email, user_role, authc_id = parse_ldap_res(
                result_data, enable_sasl, sasl_mechanism, sasl_authc_id_attr, contact_email_attr, role_attr)
        except Exception as e:
            raise Exception('parse ldap result failed: %s' % e)

        try:
            user_bind = self.ldap_bind(server_url, dn, authc_id,
                                       password, enable_sasl,
                                       sasl_mechanism, follow_referrals)
        except Exception as e:
            raise Exception(e)

        user_bind.unbind_s()
        return nickname, contact_email, user_role

    def authenticate(self, ldap_user=None, password=None):
        if not ENABLE_LDAP:
            return

        # search user from ldap server
        try:
            auth_user = SocialAuthUser.objects.filter(username=ldap_user, provider=LDAP_PROVIDER).first()
            if auth_user:
                login_attr = auth_user.uid
            else:
                login_attr = ldap_user

            nickname, contact_email, user_role = self.search_user(
                LDAP_SERVER_URL, LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD, ENABLE_SASL, SASL_MECHANISM,
                SASL_AUTHC_ID_ATTR, LDAP_BASE_DN, LDAP_LOGIN_ATTR, login_attr, password, LDAP_FILTER,
                LDAP_CONTACT_EMAIL_ATTR, LDAP_USER_ROLE_ATTR, LDAP_FOLLOW_REFERRALS)
            ldap_provider = LDAP_PROVIDER
        except Exception as e:
            if ENABLE_MULTI_LDAP:
                auth_user = SocialAuthUser.objects.filter(username=ldap_user, provider=MULTI_LDAP_1_PROVIDER).first()
                if auth_user:
                    login_attr = auth_user.uid
                else:
                    login_attr = ldap_user

                try:
                    nickname, contact_email, user_role = self.search_user(
                        MULTI_LDAP_1_SERVER_URL, MULTI_LDAP_1_ADMIN_DN, MULTI_LDAP_1_ADMIN_PASSWORD,
                        MULTI_LDAP_1_ENABLE_SASL, MULTI_LDAP_1_SASL_MECHANISM, MULTI_LDAP_1_SASL_AUTHC_ID_ATTR,
                        MULTI_LDAP_1_BASE_DN, MULTI_LDAP_1_LOGIN_ATTR, login_attr, password, MULTI_LDAP_1_FILTER,
                        MULTI_LDAP_1_CONTACT_EMAIL_ATTR, MULTI_LDAP_1_USER_ROLE_ATTR, MULTI_LDAP_1_FOLLOW_REFERRALS)
                    ldap_provider = MULTI_LDAP_1_PROVIDER
                except Exception as e:
                    logger.error(e)
                    return
            else:
                logger.error(e)
                return

        # check if existed
        ldap_auth_user = SocialAuthUser.objects.filter(provider=ldap_provider, uid=login_attr).first()
        if ldap_auth_user:
            user = self.get_user(ldap_auth_user.username)
            if not user:
                # Means found user in social_auth_usersocialauth but not found user in EmailUser,
                # delete it and recreate one.
                logger.warning('The DB data is invalid, delete it and recreate one.')
                SocialAuthUser.objects.filter(provider=ldap_provider, uid=login_attr).delete()
        else:
            # compatible with old users
            try:
                user = User.objects.get_old_user(ldap_user, ldap_provider, login_attr)
            except User.DoesNotExist:
                user = None

        if not user:
            try:
                user = User.objects.create_ldap_user(is_active=True)
                SocialAuthUser.objects.add(user.username, ldap_provider, login_attr)
            except Exception as e:
                logger.error(f'recreate ldap user failed. {e}')
                return

        username = user.username
        if LDAP_UPDATE_USER_WHEN_LOGIN:
            try:
                if nickname:
                    Profile.objects.add_or_update(username, nickname=nickname)
                if contact_email:
                    p = Profile.objects.get_profile_by_user(username)
                    if not (p and p.is_manually_set_contact_email):
                        Profile.objects.add_or_update(username, contact_email=contact_email)
            except Exception as e:
                logger.error(f'update ldap user failed {e}')

        if user_role:
            User.objects.update_role(username, user_role)
        return user


# Register related
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
            new_user.backend = settings.AUTHENTICATION_BACKENDS[0]

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
            activated.backend = settings.AUTHENTICATION_BACKENDS[0]
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
    attrs_dict = {'class': 'input'}

    email = forms.CharField(widget=forms.TextInput(attrs=dict(attrs_dict, maxlength=75)),
                            label=_("Email address"))

    userid = forms.RegexField(regex=r'^\w+$',
                              max_length=40,
                              required=False,
                              widget=forms.TextInput(),
                              label=_("Username"),
                              error_messages={'invalid': _("This value must be of length 40")})

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

        email = get_virtual_id_by_email(email)
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
    attrs_dict = {'class': 'input'}

    try:
        from seahub.settings import REGISTRATION_DETAILS_MAP
    except ImportError:
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


# Move here to avoid circular import
from seahub.base.templatetags.seahub_tags import email2nickname, \
    email2contact_email
