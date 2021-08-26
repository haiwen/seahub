# Copyright (c) 2012-2016 Seafile Ltd.
# Copyright (C) 2010-2013 Yaco Sistemas (http://www.yaco.es)
# Copyright (C) 2009 Lorenzo Gil Sanchez <lorenzo.gil.sanchez@gmail.com>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#            http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import logging

from django.conf import settings
from seahub import auth
from django.urls import reverse
from django.http import HttpResponseRedirect  # 30x
from django.http import HttpResponseBadRequest, HttpResponseForbidden  # 40x
from django.views.decorators.http import require_POST
try:
    from django.views.decorators.csrf import csrf_exempt
except ImportError:
    # Django 1.0 compatibility
    def csrf_exempt(view_func):
        return view_func

from saml2 import BINDING_HTTP_POST
from saml2.client import Saml2Client
from saml2.sigver import MissingKey
from saml2.ident import code

from djangosaml2.cache import IdentityCache, OutstandingQueriesCache
from djangosaml2.conf import get_config
from djangosaml2.signals import post_authenticated
from djangosaml2.utils import get_custom_setting

from seahub.auth import login as auth_login
from seahub.auth.decorators import login_required
# Added by khorkin
from seahub.base.sudo_mode import update_sudo_mode_ts

logger = logging.getLogger('djangosaml2')


def _set_subject_id(session, subject_id):
    session['_saml2_subject_id'] = code(subject_id)


@require_POST
@csrf_exempt
def assertion_consumer_service(request,
                               config_loader_path=None,
                               attribute_mapping=None,
                               create_unknown_user=None):
    """SAML Authorization Response endpoint

    The IdP will send its response to this view, which
    will process it with pysaml2 help and log the user
    in using the custom Authorization backend
    djangosaml2.backends.Saml2Backend that should be
    enabled in the settings.py
    """
    attribute_mapping = attribute_mapping or get_custom_setting(
            'SAML_ATTRIBUTE_MAPPING', {'uid': ('username', )})
    create_unknown_user = create_unknown_user or get_custom_setting(
            'SAML_CREATE_UNKNOWN_USER', True)
    logger.debug('Assertion Consumer Service started')

    conf = get_config(config_loader_path, request)
    if 'SAMLResponse' not in request.POST:
        return HttpResponseBadRequest(
            'Couldn\'t find "SAMLResponse" in POST data.')
    xmlstr = request.POST['SAMLResponse']
    client = Saml2Client(conf, identity_cache=IdentityCache(request.session))

    oq_cache = OutstandingQueriesCache(request.session)
    outstanding_queries = oq_cache.outstanding_queries()

    try:
        response = client.parse_authn_request_response(xmlstr, BINDING_HTTP_POST,
                                                       outstanding_queries)
    except MissingKey:
        logger.error('MissingKey error in ACS')
        return HttpResponseForbidden(
            "The Identity Provider is not configured correctly: "
            "the certificate key is missing")
    if response is None:
        logger.error('SAML response is None')
        return HttpResponseBadRequest(
            "SAML response has errors. Please check the logs")

    session_id = response.session_id()
    oq_cache.delete(session_id)

    # authenticate the remote user
    session_info = response.session_info()

    if callable(attribute_mapping):
        attribute_mapping = attribute_mapping()
    if callable(create_unknown_user):
        create_unknown_user = create_unknown_user()

    logger.debug('Trying to authenticate the user')
    user = auth.authenticate(session_info=session_info,
                             attribute_mapping=attribute_mapping,
                             create_unknown_user=create_unknown_user)
    if user is None:
        logger.error('The user is None')
        return HttpResponseForbidden("Permission denied")

    if not user.is_active:
        logger.error('The user is inactive')
        return HttpResponseForbidden("Permission denied")

    auth_login(request, user)
    _set_subject_id(request.session, session_info['name_id'])

    logger.debug('Sending the post_authenticated signal')
    post_authenticated.send_robust(sender=user, session_info=session_info)

    # redirect the user to the view where he came from
    default_relay_state = get_custom_setting('ACS_DEFAULT_REDIRECT_URL',
                                             settings.LOGIN_REDIRECT_URL)
    relay_state = request.POST.get('RelayState', default_relay_state)
    if not relay_state:
        logger.warning('The RelayState parameter exists but is empty')
        relay_state = default_relay_state
    logger.debug('Redirecting to the RelayState: %s', relay_state)
    return HttpResponseRedirect(relay_state)


@login_required
def auth_complete(request):
    from seahub.api2.utils import get_token_v1, get_token_v2
    # generate tokenv2 using information in request params
    keys = (
        'platform',
        'device_id',
        'device_name',
        'client_version',
        'platform_version',
    )
    if all(['shib_' + key in request.GET for key in keys]):
        platform = request.GET['shib_platform']
        device_id = request.GET['shib_device_id']
        device_name = request.GET['shib_device_name']
        client_version = request.GET['shib_client_version']
        platform_version = request.GET['shib_platform_version']
        token = get_token_v2(
            request, request.user.username, platform, device_id,
            device_name, client_version, platform_version)
    elif all(['shib_' + key not in request.GET for key in keys]):
        token = get_token_v1(request.user.username)

    resp = HttpResponseRedirect(reverse('libraries'))
    resp.set_cookie('seahub_auth', request.user.username + '@' + token.key)

    # Added by Khorkin update sudo timestamp
    if request.user.is_authenticated:
        if request.user.is_staff:
            update_sudo_mode_ts(request)

    return resp
