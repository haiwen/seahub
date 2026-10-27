# -*- coding: utf-8 -*-

import os
import sys
import logging
from django.http import HttpResponseRedirect
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.translation import gettext as _
from django.views.decorators.http import require_POST

from seaserv import seafile_api, ccnet_api

from seahub.api2.utils import get_api_token
from seahub import auth
from seahub.auth.decorators import login_required
from seahub.profile.models import Profile
from seahub.utils import render_error, get_service_url
from seahub.utils.file_size import get_quota_from_string
from seahub.utils.auth import user_local_password_enabled, VIRTUAL_ID_EMAIL_DOMAIN
from seahub.base.accounts import User, UNUSABLE_PASSWORD
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role
from seahub.auth.models import SocialAuthUser
import seahub.settings as settings

logger = logging.getLogger(__name__)


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
    # Consume the state and operation together so retries cannot become logins.
    oauth_state = request.session.pop('oauth_state', None)
    oauth_connect = request.session.pop('oauth_connect', False)
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
    if oauth_connect:
        if not request.user.is_authenticated:
            return render_error(request, _('Failed to connect OAuth, please login first.'))

        oauth_user = SocialAuthUser.objects.get_by_provider_and_uid(OAUTH_PROVIDER, uid)
        if oauth_user and oauth_user.username != request.user.username:
            return render_error(request, _('The OAuth account has already been connected to another account.'))

        if not oauth_user:
            if SSO_LDAP_USE_SAME_UID:
                ldap_user = SocialAuthUser.objects.get_by_provider_and_uid(LDAP_PROVIDER, uid)
                if ldap_user and ldap_user.username != request.user.username:
                    return render_error(request, _('The OAuth account has already been connected to another LDAP account.'))

            if not SocialAuthUser.objects.add(request.user.username, OAUTH_PROVIDER, uid):
                logger.error('Failed to bind OAuth account to user %s.',
                             request.user.username)
                return render_error(request, _('Failed to connect OAuth, please contact administrator.'))

        return HttpResponseRedirect(request.session.get('oauth_redirect',
                                                        settings.LOGIN_REDIRECT_URL))

    # Resolve existing OAuth bindings, including configured LDAP UID linking.
    oauth_user = SocialAuthUser.objects.get_by_provider_and_uid(OAUTH_PROVIDER, uid)
    if not oauth_user and SSO_LDAP_USE_SAME_UID:
        oauth_user = SocialAuthUser.objects.get_by_provider_and_uid(LDAP_PROVIDER, uid)
        if oauth_user:
            SocialAuthUser.objects.add(oauth_user.username, OAUTH_PROVIDER, uid)
    if oauth_user:
        email = oauth_user.username
        is_new_user = False
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

    # Contact emails are unique; an unbound identity may share an existing
    # account's email, but must not take over that account or its address.
    if contact_email and not Profile.objects.filter(
            contact_email=contact_email.strip()).exclude(user=email).exists():
        profile.contact_email = contact_email.strip()
        profile.save()

    if login_id and not Profile.objects.filter(
            login_id=login_id.strip()).exclude(user=email).exists():
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
    if url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
        return next_url
    return settings.LOGIN_REDIRECT_URL


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
    """Disconnect the currently logged-in local account from the OAuth provider."""
    if request.user.enc_password == UNUSABLE_PASSWORD:
        return render_error(request, _('Failed to unbind OAuth, please set a password first.'))

    if not user_local_password_enabled(request.user):
        return render_error(request, _('Failed to unbind OAuth, the user is forced login by SSO.'))

    if not _can_login_without_oauth(request.user.username):
        return render_error(request, _('Failed to unbind OAuth, please set a contact email or login ID first.'))

    SocialAuthUser.objects.delete_by_username_and_provider(
        request.user.username, OAUTH_PROVIDER)

    return HttpResponseRedirect(_get_safe_next_url(request))


def custom_oauth_logout_redirect(request):
    if ENABLE_CUSTOM_OAUTH:
        handler = getattr(custom_oauth_login, 'logout', None)
        if handler:
            return handler(request)
    return None


def custom_oauth_login_redirect(request):
    """Only opt-in custom providers replace the local password form."""
    if not ENABLE_CUSTOM_OAUTH:
        return render_error(request, _('Feature is not enabled.'))
    if getattr(custom_oauth_login, 'intranet_login', False):
        is_external = getattr(custom_oauth_login, 'is_external_request', None)
        if is_external:
            try:
                if not is_external(request):
                    return None
            except ValueError:
                return render_error(request, _('Invalid custom login configuration.'))
        return custom_oauth_login(request)
    return None


def custom_oauth_login_view(request):
    if not ENABLE_CUSTOM_OAUTH:
        return render_error(request, _('Feature is not enabled.'))

    if (request.user.is_authenticated and
            not getattr(custom_oauth_login, 'intranet_login', False)):
        # already authenticated
        redirect_url = request.GET.get(auth.REDIRECT_FIELD_NAME, settings.LOGIN_REDIRECT_URL)
        return HttpResponseRedirect(redirect_url)

    return custom_oauth_login(request)


def custom_oauth_callback_view(request):
    if not ENABLE_CUSTOM_OAUTH:
        return render_error(request, _('Feature is not enabled.'))

    return custom_oauth_callback(request)
