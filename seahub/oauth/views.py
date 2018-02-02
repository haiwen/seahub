# -*- coding: utf-8 -*-

import os
import logging
from django.http import HttpResponseRedirect
from django.template import RequestContext
from django.shortcuts import render_to_response
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext as _

from constance import config

from seahub import auth
from seahub.profile.models import Profile
from seahub.utils import is_valid_email
from seahub.base.accounts import User
import seahub.settings as settings

logger = logging.getLogger(__name__)

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

    # Used for init an user for Seahub.
    PROVIDER_DOMAIN = getattr(settings, 'OAUTH_PROVIDER_DOMAIN', '')
    ATTRIBUTE_MAP = {
        'id': (True, "email"),
    }
    ATTRIBUTE_MAP.update(getattr(settings, 'OAUTH_ATTRIBUTE_MAP', {}))

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
            return render_to_response('error.html', {
                    'error_msg': _('Error, please contact administrator.'),
                    }, context_instance=RequestContext(request))

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
                            scope=SCOPE, redirect_uri=REDIRECT_URL)

    try:
        authorization_url, state = session.authorization_url(
                AUTHORIZATION_URL)
    except Exception as e:
        logger.error(e)
        return render_to_response('error.html', {
                'error_msg': _('Error, please contact administrator.'),
                }, context_instance=RequestContext(request))

    request.session['oauth_state'] = state
    return HttpResponseRedirect(authorization_url)

# Step 2: User authorization, this happens on the provider.

@oauth_check
def oauth_callback(request):
    """ Step 3: Retrieving an access token.
    The user has been redirected back from the provider to your registered
    callback URL. With this redirection comes an authorization code included
    in the redirect URL. We will use that to obtain an access token.
    """
    session = OAuth2Session(client_id=CLIENT_ID, scope=SCOPE,
                            state=request.session.get('oauth_state', None),
                            redirect_uri=REDIRECT_URL)

    try:
        session.fetch_token(TOKEN_URL, client_secret=CLIENT_SECRET,
                authorization_response=request.get_full_path())
        user_info_resp = session.get(USER_INFO_URL)
    except Exception as e:
        logger.error(e)
        return render_to_response('error.html', {
                'error_msg': _('Error, please contact administrator.'),
                }, context_instance=RequestContext(request))

    def format_user_info(user_info_resp):

        error = False
        user_info = {}
        user_info_json = user_info_resp.json()

        for item, attr in ATTRIBUTE_MAP.items():
            required, user_attr = attr
            value = user_info_json.get(item, '')

            if value:
                # ccnet email
                if user_attr == 'email':
                    user_info[user_attr] = value if is_valid_email(str(value)) else \
                            '%s@%s' % (str(value), PROVIDER_DOMAIN)
                else:
                    user_info[user_attr] = value
            elif required:
                error = True

        return user_info, error

    user_info, error = format_user_info(user_info_resp)
    if error:
        logger.error('Required user info not found.')
        logger.error(user_info)
        return render_to_response('error.html', {
                'error_msg': _('Error, please contact administrator.'),
                }, context_instance=RequestContext(request))

    # seahub authenticate user
    email = user_info['email']

    try:
        User.objects.get(email=email)
    except User.DoesNotExist:
        if not config.ENABLE_SIGNUP:
            logger.error('%s not found but user registration is disabled.' % email)
            return render_to_response('error.html', {
                    'error_msg': _('Error, please contact administrator.'),
                    }, context_instance=RequestContext(request))

    try:
        user = auth.authenticate(remote_user=email)
    except User.DoesNotExist:
        user = None

    if not user or not user.is_active:
        logger.error('User %s not found or inactive.' % email)
        # a page for authenticate user failed
        return render_to_response('error.html', {
                'error_msg': _(u'User %s not found.') % email
                }, context_instance=RequestContext(request))

    # User is valid.  Set request.user and persist user in the session
    # by logging the user in.
    request.user = user
    auth.login(request, user)
    user.set_unusable_password()
    user.save()

    # update user's profile
    name = user_info['name'] if user_info.has_key('name') else ''
    contact_email = user_info['contact_email'] if \
            user_info.has_key('contact_email') else ''

    profile = Profile.objects.get_profile_by_user(email)
    if not profile:
        profile = Profile(user=email)

    if name:
        profile.nickname = name.strip()
        profile.save()

    if contact_email:
        profile.contact_email = contact_email.strip()
        profile.save()

    # redirect user to home page
    return HttpResponseRedirect(reverse('libraries'))
