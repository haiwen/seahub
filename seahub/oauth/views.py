# -*- coding: utf-8 -*-

import os
import sys
import logging
import hashlib
from django.http import HttpResponseRedirect
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.translation import gettext as _
from django.views.decorators.http import require_POST

from seaserv import seafile_api, ccnet_api

from seahub.api2.utils import get_api_token
from seahub import auth
from seahub.auth.decorators import login_required
from seahub.profile.models import Profile
from seahub.options.models import UserOptions
from seahub.utils import is_valid_email, render_error, get_service_url
from seahub.utils.file_size import get_quota_from_string
from seahub.utils.auth import user_local_password_enabled, VIRTUAL_ID_EMAIL_DOMAIN
from seahub.base.accounts import User, UNUSABLE_PASSWORD
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role
from seahub.auth.models import SocialAuthUser
import seahub.settings as settings

logger = logging.getLogger(__name__)

# UserOptions key storing a hash of the OAuth uid a user explicitly
# disconnected, so the callback does not auto-link that identity again.
OAUTH_UNBIND_OPTION_KEY = 'oauth_unbind_uid'


def _oauth_uid_hash(uid):
    return hashlib.sha1(str(uid).encode('utf-8')).hexdigest()


def _oauth_identity_disconnected(uid):
    return UserOptions.objects.filter(
        option_key=OAUTH_UNBIND_OPTION_KEY,
        option_val=_oauth_uid_hash(uid)).exists()


def _can_login_without_oauth(username):
    """Return whether ``username`` can log in once its OAuth binding is gone.

    Accounts created for SSO/OAuth users have a virtual username, so they can
    only log in through their contact email or login ID.
    """
    if not username.endswith(VIRTUAL_ID_EMAIL_DOMAIN):
        return True

    profile = Profile.objects.get_profile_by_user(username)
    return bool(profile and (profile.contact_email or profile.login_id))


LDAP_PROVIDER = getattr(settings, 'LDAP_PROVIDER', 'ldap')
SSO_LDAP_USE_SAME_UID = getattr(settings, 'SSO_LDAP_USE_SAME_UID', False)

try:
    current_path = os.path.dirname(os.path.abspath(__file__))
    seafile_conf_dir = os.path.join(current_path, '../../../../conf')
    sys.path.append(seafile_conf_dir)
    from seahub_custom_functions import custom_get_user_role
    CUSTOM_GET_USER_ROLE = True
except ImportError:
    CUSTOM_GET_USER_ROLE = False


ENABLE_OAUTH = getattr(settings, 'ENABLE_OAUTH', False)
if ENABLE_OAUTH:

    from requests_oauthlib import OAuth2Session

    if getattr(settings, 'OAUTH_ENABLE_INSECURE_TRANSPORT', False):
        os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

    # Used for oauth workflow.
    CLIENT_ID = getattr(settings, 'OAUTH_CLIENT_ID', '')
    CLIENT_SECRET = getattr(settings, 'OAUTH_CLIENT_SECRET', '')
    AUTHORIZATION_URL = getattr(settings, 'OAUTH_AUTHORIZATION_URL', '')
    REDIRECT_URL = getattr(settings, 'OAUTH_REDIRECT_URL', '')
    TOKEN_URL = getattr(settings, 'OAUTH_TOKEN_URL', '')
    USER_INFO_URL = getattr(settings, 'OAUTH_USER_INFO_URL', '')
    SCOPE = getattr(settings, 'OAUTH_SCOPE', '')
    ACCESS_TOKEN_IN_URI = getattr(settings, 'OAUTH_ACCESS_TOKEN_IN_URI', False)
    INCLUDE_CLIENT_ID = getattr(settings, 'OAUTH_INCLUDE_CLIENT_ID', None)

    # Used for init an user for Seahub.
    OAUTH_PROVIDER = getattr(settings, 'OAUTH_PROVIDER', '')
    if not OAUTH_PROVIDER:
        OAUTH_PROVIDER = getattr(settings, 'OAUTH_PROVIDER_DOMAIN', '')
    OAUTH_ATTRIBUTE_MAP = getattr(settings, 'OAUTH_ATTRIBUTE_MAP', {})

ENABLE_CUSTOM_OAUTH = getattr(settings, 'ENABLE_CUSTOM_OAUTH', False)
if ENABLE_CUSTOM_OAUTH:
    try:
        current_path = os.path.dirname(os.path.abspath(__file__))
        conf_dir = os.path.join(current_path, '../../../../conf')
        sys.path.append(conf_dir)
        from seahub_custom_functions import custom_oauth_login, custom_oauth_callback
        ENABLE_CUSTOM_OAUTH = True
    except ImportError:
        ENABLE_CUSTOM_OAUTH = False


def oauth_check(func):
    """ Decorator for check if OAuth valid.
    """

    def _decorated(request):

        error = False
        if not ENABLE_OAUTH:
            logger.error('OAuth not enabled.')
            error = True
        else:
            if not CLIENT_ID or not CLIENT_SECRET or not AUTHORIZATION_URL \
                    or not REDIRECT_URL or not TOKEN_URL or not USER_INFO_URL \
                    or not SCOPE or not OAUTH_PROVIDER:
                logger.error('OAuth relevant settings invalid.')
                logger.error('CLIENT_ID_ASSIGNED: %s' % bool(CLIENT_ID))
                logger.error('AUTHORIZATION_URL_ASSIGNED: %s' % bool(AUTHORIZATION_URL))
                logger.error('REDIRECT_URL_ASSIGNED: %s' % bool(REDIRECT_URL))
                logger.error('TOKEN_URL_ASSIGNED: %s' % bool(TOKEN_URL))
                logger.error('USER_INFO_URL_ASSIGNED: %s' % bool(USER_INFO_URL))
                logger.error('SCOPE_ASSIGNED: %s' % bool(SCOPE))
                logger.error('OAUTH_PROVIDER_ASSIGNED: %s' % bool(OAUTH_PROVIDER))
                logger.error('CLIENT_SECRET_ASSIGNED: %s' % bool(CLIENT_SECRET))
                error = True

        if error:
            return render_error(request,
                                _('Error, please contact administrator.'))

        return func(request)

    return _decorated


# https://requests-oauthlib.readthedocs.io/en/latest/examples/github.html
# https://requests-oauthlib.readthedocs.io/en/latest/examples/google.html
@oauth_check
def oauth_login(request):
    """Step 1: User Authorization.
    Redirect the user/resource owner to the OAuth provider (i.e. Github)
    using an URL with a few key OAuth parameters.
    """
    session = OAuth2Session(client_id=CLIENT_ID,
                            scope=SCOPE,
                            redirect_uri=REDIRECT_URL)

    try:
        authorization_url, state = session.authorization_url(AUTHORIZATION_URL)
    except Exception as e:
        logger.error(e)
        return render_error(request, _('Error, please contact administrator.'))

    request.session.pop('oauth_connect', None)
    request.session['oauth_state'] = state
    request.session['oauth_redirect'] = _get_safe_next_url(request)
    return HttpResponseRedirect(authorization_url)


# Step 2: User authorization, this happens on the provider.
@oauth_check
def oauth_callback(request):
    """ Step 3: Retrieving an access token.
    The user has been redirected back from the provider to your registered
    callback URL. With this redirection comes an authorization code included
    in the redirect URL. We will use that to obtain an access token.
    """
    oauth_state = request.session.get('oauth_state')
    if not oauth_state:
        logger.error('OAuth state is not found in session.')
        return render_error(request, _('Error, please contact administrator.'))

    session = OAuth2Session(client_id=CLIENT_ID,
                            scope=SCOPE,
                            state=oauth_state,
                            redirect_uri=REDIRECT_URL)

    service_url = get_service_url().strip('/')

    try:
        token = session.fetch_token(
            TOKEN_URL,
            client_secret=CLIENT_SECRET,
            include_client_id=INCLUDE_CLIENT_ID,
            authorization_response=service_url + request.get_full_path())

        if 'user_id' in session._client.__dict__['token']:
            # used for sjtu.edu.cn
            # https://xjq12311.gitbooks.io/sjtu-engtc/content/
            user_id = session._client.__dict__['token']['user_id']
            user_info_resp = session.get(USER_INFO_URL +
                                         '?user_id=%s' % user_id)
        else:
            user_info_url = USER_INFO_URL
            if ACCESS_TOKEN_IN_URI:
                code = request.GET.get('code')
                user_info_url = USER_INFO_URL + '?access_token=%s&code=%s' % (
                    token['access_token'], code)
            user_info_resp = session.get(user_info_url)

    except Exception as e:
        logger.error(e)
        return render_error(request, _('Error, please contact administrator.'))

    oauth_user_info = {}
    user_info_json = user_info_resp.json()
    for oauth_attr, attr_tuple in OAUTH_ATTRIBUTE_MAP.items():
        required, user_attr = attr_tuple
        attr_value = user_info_json.get(oauth_attr, '')
        if attr_value:
            oauth_user_info[user_attr] = attr_value
        elif required:
            logger.error('Required user attr not found.')
            logger.error(user_info_json)
            return render_error(request, _('Error, please contact administrator.'))

    uid = oauth_user_info.get('uid', '') or oauth_user_info.get('email', '')
    if not uid:
        logger.error('oauth user uid and email not found.')
        logger.error('user_info_json: %s' % user_info_json)
        return render_error(request, _('Error, please contact administrator.'))

    # `oauth_connect` is set by the `oauth_connect` view: bind the OAuth
    # account to the currently logged-in local user instead of logging in.
    if request.session.pop('oauth_connect', False):
        if not request.user.is_authenticated:
            return render_error(request, _('Failed to connect OAuth, please login first.'))

        oauth_user = SocialAuthUser.objects.get_by_provider_and_uid(OAUTH_PROVIDER, uid)
        if oauth_user and oauth_user.username != request.user.username:
            return render_error(request, _('The OAuth account has already been connected to another account.'))

        if not oauth_user:
            if not SocialAuthUser.objects.add(request.user.username, OAUTH_PROVIDER, uid):
                logger.error('Failed to bind OAuth uid %s to user %s.',
                             uid, request.user.username)
                return render_error(request, _('Failed to connect OAuth, please contact administrator.'))

        UserOptions.objects.unset_user_option(
            request.user.username, OAUTH_UNBIND_OPTION_KEY)

        return HttpResponseRedirect(request.session.get('oauth_redirect',
                                                        settings.LOGIN_REDIRECT_URL))

    # compatible with old users via email
    old_email = oauth_user_info.get('email', '')

    oauth_user = SocialAuthUser.objects.get_by_provider_and_uid(OAUTH_PROVIDER, uid)
    if not oauth_user and _oauth_identity_disconnected(uid):
        # The user explicitly disconnected this OAuth identity; do not
        # auto-link it to a local account again.
        logger.info('OAuth account %s was disconnected; skip auto-link.', uid)
        return render_error(request, _('This OAuth account was disconnected from your account. Please login with your password first, then connect it again.'))
    if not oauth_user and SSO_LDAP_USE_SAME_UID:
        oauth_user = SocialAuthUser.objects.get_by_provider_and_uid(LDAP_PROVIDER, uid)
        if oauth_user:
            SocialAuthUser.objects.add(oauth_user.username, OAUTH_PROVIDER, uid)
    if oauth_user:
        email = oauth_user.username
        is_new_user = False
    elif old_email:
        if not is_valid_email(str(old_email)):
            # In previous versions, if 'email' is not in mailbox format,
            # we combine 'email' and 'provider' to mailbox format.
            old_email = '%s@%s' % (str(old_email), OAUTH_PROVIDER)
        try:
            old_user = User.objects.get_old_user(old_email, OAUTH_PROVIDER, uid)
            email = old_user.username
            is_new_user = False
        except User.DoesNotExist:
            email = None
            is_new_user = True
    else:
        email = None
        is_new_user = True

    try:
        user = auth.authenticate(remote_user=email)
    except User.DoesNotExist:
        user = None
    except Exception as e:
        logger.error(e)
        return render_error(request, _('Error, please contact administrator.'))

    if not user:
        return render_error(request, _('Error, new user registration is not allowed, please contact administrator.'))

    email = user.username
    if is_new_user:
        SocialAuthUser.objects.add(email, OAUTH_PROVIDER, uid)

    # User is valid.  Set request.user and persist user in the session
    # by logging the user in.
    request.user = user
    auth.login(request, user)
    oauth_id_token = token.get('id_token')
    if oauth_id_token:
        request.session['oauth_id_token'] = oauth_id_token
    else:
        request.session.pop('oauth_id_token', None)

    # update user's profile
    name = oauth_user_info.get('name', '')
    contact_email = oauth_user_info.get('contact_email', '')
    login_id = oauth_user_info.get('login_id', '')

    profile = Profile.objects.get_profile_by_user(email)
    if not profile:
        profile = Profile(user=email)

    if name:
        profile.nickname = name.strip()
        profile.save()

    if contact_email:
        profile.contact_email = contact_email.strip()
        profile.save()

    if login_id:
        profile.login_id = login_id.strip()
        profile.save()

    if CUSTOM_GET_USER_ROLE:
        remote_role_value = oauth_user_info.get('role', '')
        if remote_role_value:
            role = custom_get_user_role(remote_role_value)

            # update user role
            ccnet_api.update_role_emailuser(email, role)

            # update user role quota
            role_quota = get_enabled_role_permissions_by_role(role)['role_quota']
            if role_quota:
                quota = get_quota_from_string(role_quota)
                seafile_api.set_role_quota(role, quota)

    # generate auth token for Seafile client
    api_token = get_api_token(request)

    # redirect user to home page
    response = HttpResponseRedirect(request.session.get('oauth_redirect', '/'))
    response.set_cookie('seahub_auth', email + '@' + api_token.key)
    response.set_cookie('via_oauth', 'true')
    return response


def _get_safe_next_url(request):
    next_url = request.GET.get(auth.REDIRECT_FIELD_NAME, settings.LOGIN_REDIRECT_URL)
    if not url_has_allowed_host_and_scheme(url=next_url,
                                           allowed_hosts={request.get_host()}):
        next_url = settings.LOGIN_REDIRECT_URL
    return next_url


@login_required
@oauth_check
def oauth_connect(request):
    """Connect the currently logged-in local account to the OAuth provider."""
    next_url = _get_safe_next_url(request)

    if SocialAuthUser.objects.filter(
            username=request.user.username, provider=OAUTH_PROVIDER).exists():
        return HttpResponseRedirect(next_url)

    session = OAuth2Session(client_id=CLIENT_ID,
                            scope=SCOPE,
                            redirect_uri=REDIRECT_URL)
    try:
        authorization_url, state = session.authorization_url(AUTHORIZATION_URL)
    except Exception as e:
        logger.error(e)
        return render_error(request, _('Error, please contact administrator.'))

    request.session['oauth_state'] = state
    request.session['oauth_redirect'] = next_url
    request.session['oauth_connect'] = True
    return HttpResponseRedirect(authorization_url)


@login_required
@require_POST
@oauth_check
def oauth_disconnect(request):
    """Disconnect the currently logged-in local account from the OAuth provider.

    The disconnect is remembered in UserOptions, so the callback does not
    re-link the OAuth account by email on a later OAuth login.
    """
    if request.user.enc_password == UNUSABLE_PASSWORD:
        return render_error(request, _('Failed to unbind OAuth, please set a password first.'))

    if not user_local_password_enabled(request.user):
        return render_error(request, _('Failed to unbind OAuth, the user is forced login by SSO.'))

    if not _can_login_without_oauth(request.user.username):
        return render_error(request, _('Failed to unbind OAuth, please set a contact email or login ID first.'))

    bound_uids = list(SocialAuthUser.objects.filter(
        username=request.user.username,
        provider=OAUTH_PROVIDER).values_list('uid', flat=True))
    SocialAuthUser.objects.delete_by_username_and_provider(
        request.user.username, OAUTH_PROVIDER)
    for uid in bound_uids:
        UserOptions.objects.set_user_option(
            request.user.username, OAUTH_UNBIND_OPTION_KEY,
            _oauth_uid_hash(uid))

    return HttpResponseRedirect(_get_safe_next_url(request))


def custom_oauth_login_view(request):
    if not ENABLE_CUSTOM_OAUTH:
        return render_error(request, _('Feature is not enabled.'))

    if request.user.is_authenticated:
        # already authenticated
        redirect_url = request.GET.get(auth.REDIRECT_FIELD_NAME, settings.LOGIN_REDIRECT_URL)
        return HttpResponseRedirect(redirect_url)

    return custom_oauth_login(request)


def custom_oauth_callback_view(request):
    if not ENABLE_CUSTOM_OAUTH:
        return render_error(request, _('Feature is not enabled.'))

    return custom_oauth_callback(request)
