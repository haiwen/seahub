# -*- coding: utf-8 -*-

import os
import sys
import logging
from django.http import HttpResponseRedirect
from django.utils.translation import gettext as _

from seaserv import seafile_api, ccnet_api

from seahub.api2.utils import get_api_token
from seahub import auth
from seahub.profile.models import Profile
from seahub.utils import is_valid_email, render_error, get_service_url
from seahub.utils.file_size import get_quota_from_string
from seahub.base.accounts import User
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role
from seahub.auth.models import SocialAuthUser
import seahub.settings as settings

logger = logging.getLogger(__name__)

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
    PROVIDER_DOMAIN = getattr(settings, 'OAUTH_PROVIDER_DOMAIN', '')
    OAUTH_ATTRIBUTE_MAP = getattr(settings, 'OAUTH_ATTRIBUTE_MAP', {})


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
                    or not SCOPE or not PROVIDER_DOMAIN:
                logger.error('OAuth relevant settings invalid.')
                logger.error('CLIENT_ID: %s' % CLIENT_ID)
                logger.error('CLIENT_SECRET: %s' % CLIENT_SECRET)
                logger.error('AUTHORIZATION_URL: %s' % AUTHORIZATION_URL)
                logger.error('REDIRECT_URL: %s' % REDIRECT_URL)
                logger.error('TOKEN_URL: %s' % TOKEN_URL)
                logger.error('USER_INFO_URL: %s' % USER_INFO_URL)
                logger.error('SCOPE: %s' % SCOPE)
                logger.error('PROVIDER_DOMAIN: %s' % PROVIDER_DOMAIN)
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

    request.session['oauth_state'] = state
    request.session['oauth_redirect'] = request.GET.get(
        auth.REDIRECT_FIELD_NAME, '/')
    return HttpResponseRedirect(authorization_url)


# Step 2: User authorization, this happens on the provider.
@oauth_check
def oauth_callback(request):
    """ Step 3: Retrieving an access token.
    The user has been redirected back from the provider to your registered
    callback URL. With this redirection comes an authorization code included
    in the redirect URL. We will use that to obtain an access token.
    """
    session = OAuth2Session(client_id=CLIENT_ID,
                            scope=SCOPE,
                            state=request.session.get('oauth_state', None),
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

    # compatible with old users via email
    old_email = oauth_user_info.get('email', '')

    oauth_user = SocialAuthUser.objects.get_by_provider_and_uid(PROVIDER_DOMAIN, uid)
    if oauth_user:
        email = oauth_user.username
        is_new_user = False
    elif old_email:
        if not is_valid_email(old_email):
            # In previous versions, if 'email' is not in mailbox format,
            # we combine 'email' and 'provider' to mailbox format.
            old_email = '%s@%s' % (str(old_email), PROVIDER_DOMAIN)
        try:
            old_user = User.objects.get_old_user(old_email, PROVIDER_DOMAIN, uid)
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
        SocialAuthUser.objects.add(email, PROVIDER_DOMAIN, uid)

    # User is valid.  Set request.user and persist user in the session
    # by logging the user in.
    request.user = user
    auth.login(request, user)

    # update user's profile
    name = oauth_user_info.get('name', '')
    contact_email = oauth_user_info.get('contact_email', '')

    profile = Profile.objects.get_profile_by_user(email)
    if not profile:
        profile = Profile(user=email)

    if name:
        profile.nickname = name.strip()
        profile.save()

    if contact_email:
        profile.contact_email = contact_email.strip()
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
    return response
