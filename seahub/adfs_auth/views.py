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

import re
import logging

from django.urls import reverse
from django.http import HttpResponseRedirect, HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from saml2 import BINDING_HTTP_POST
from saml2.ident import code
from saml2.client import Saml2Client
from saml2.metadata import entity_descriptor
from djangosaml2.cache import IdentityCache, OutstandingQueriesCache
from djangosaml2.conf import get_config
from djangosaml2.signals import post_authenticated
from djangosaml2.utils import get_custom_setting

from seaserv import ccnet_api

from seahub import auth
from seahub.auth import login as auth_login
from seahub.auth.decorators import login_required
from seahub import settings
# Added by khorkin
from seahub.base.sudo_mode import update_sudo_mode_ts
from seahub.utils.licenseparse import user_number_over_limit
try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED = False


logger = logging.getLogger('djangosaml2')


def _set_subject_id(session, subject_id):
    session['_saml2_subject_id'] = code(subject_id)


def login(request):
    next_url = settings.LOGIN_REDIRECT_URL
    if 'next' in request.GET:
        next_url = request.GET['next']
    elif 'RelayState' in request.GET:
        next_url = request.GET['RelayState']

    if not url_has_allowed_host_and_scheme(next_url, None):
        next_url = settings.LOGIN_REDIRECT_URL

    sp_config = get_config(None, request)
    saml_client = Saml2Client(sp_config)
    session_id, info = saml_client.prepare_for_authenticate(relay_state=next_url)
    oq_cache = OutstandingQueriesCache(request.saml_session)
    oq_cache.set(session_id, next_url)
    try:
        headers = dict(info['headers'])
        redirect_url = headers['Location']
    except KeyError:
        redirect_url = info['url']
    except Exception as e:
        logger.warning(e)
        redirect_url = None

    return HttpResponseRedirect(redirect_url)


@require_POST
@csrf_exempt
def assertion_consumer_service(request, attribute_mapping=None, create_unknown_user=True):
    """SAML Authorization Response endpoint.
    The IdP will send its response to this view, which will process it using pysaml2 and
    log the user in using whatever SAML authentication backend has been enabled in
    settings.py. The `djangosaml2.backends.Saml2Backend` can be used for this purpose,
    though some implementations may instead register their own subclasses of Saml2Backend.
    """
    if 'SAMLResponse' not in request.POST:
        return HttpResponseBadRequest('Missing "SAMLResponse" parameter in POST data.')
    attribute_mapping = attribute_mapping or get_custom_setting('SAML_ATTRIBUTE_MAPPING', None)
    conf = get_config(None, request)

    identity_cache = IdentityCache(request.saml_session)
    client = Saml2Client(conf, identity_cache=identity_cache)
    oq_cache = OutstandingQueriesCache(request.saml_session)
    oq_cache.sync()
    outstanding_queries = oq_cache.outstanding_queries()

    xmlstr = request.POST['SAMLResponse']
    try:
        response = client.parse_authn_request_response(xmlstr, BINDING_HTTP_POST, outstanding_queries)
    except Exception as e:
        logger.error(e)
        return HttpResponseBadRequest('SAMLResponse Error')

    if response is None:
        logger.error('SAML response is None')
        return HttpResponseBadRequest('SAML response has errors. Please check the logs')

    session_id = response.session_id()
    oq_cache.delete(session_id)

    # authenticate the remote user
    session_info = response.session_info()

    # check user number limit by license
    if user_number_over_limit():
        return HttpResponseForbidden('The number of users exceeds the license limit.')

    # get url_prefix
    url_prefix = ''
    reg = re.search(r'org/custom/([a-z_0-9-]+)', request.path)
    if reg:
        url_prefix = reg.group(1)
        org = ccnet_api.get_org_by_url_prefix(url_prefix)
        if org:
            # check user number limit by org member quota
            org_id = org.org_id
            org_members = len(ccnet_api.get_org_emailusers(org.url_prefix, -1, -1))
            if ORG_MEMBER_QUOTA_ENABLED:
                from seahub.organizations.models import OrgMemberQuota
                org_members_quota = OrgMemberQuota.objects.get_quota(org_id)
                if org_members_quota is not None and org_members >= org_members_quota:
                    return HttpResponseForbidden('The number of users exceeds the organization quota.')

    logger.debug('Trying to authenticate the user')
    user = auth.authenticate(session_info=session_info,
                             attribute_mapping=attribute_mapping,
                             create_unknown_user=create_unknown_user,
                             url_prefix=url_prefix)
    if user is None:
        logger.error('The user is None')
        return HttpResponseForbidden("Permission denied")

    if not user.is_active:
        logger.error('The user is inactive')
        return HttpResponseForbidden("Permission denied")

    auth_login(request, user)
    _set_subject_id(request.saml_session, session_info['name_id'])
    logger.debug('Sending the post_authenticated signal')
    post_authenticated.send_robust(sender=user, session_info=session_info)

    # redirect the user to the view where he came from
    default_relay_state = settings.LOGIN_REDIRECT_URL
    relay_state = request.POST.get('RelayState', default_relay_state)
    if not relay_state:
        logger.warning('The RelayState parameter exists but is empty')
        relay_state = default_relay_state
    logger.debug('Redirecting to the RelayState: %s', relay_state)
    return HttpResponseRedirect(relay_state)


def metadata(request):
    sp_config = get_config(None, request)
    sp_metadata = entity_descriptor(sp_config)
    return HttpResponse(
        content=str(sp_metadata).encode("utf-8"),
        content_type="text/xml; charset=utf-8",
    )


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
    elif all(['shib_' + key in request.session for key in keys]):
        platform = request.session['shib_platform']
        device_id = request.session['shib_device_id']
        device_name = request.session['shib_device_name']
        client_version = request.session['shib_client_version']
        platform_version = request.session['shib_platform_version']
        token = get_token_v2(
            request, request.user.username, platform, device_id,
            device_name, client_version, platform_version)
    else:
        token = get_token_v1(request.user.username)

    resp = HttpResponseRedirect(reverse('libraries'))
    resp.set_cookie('seahub_auth', request.user.username + '@' + token.key)

    # Added by Khorkin update sudo timestamp
    if request.user.is_authenticated:
        if request.user.is_staff:
            update_sudo_mode_ts(request)

    return resp


def multi_adfs_login(request):
    if getattr(settings, 'ENABLE_MULTI_ADFS', False):
        return HttpResponseRedirect(request.path.rstrip('/') + '/saml2/login/')
