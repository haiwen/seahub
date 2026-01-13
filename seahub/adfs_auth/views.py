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
from urllib.parse import unquote, parse_qs, urlparse

from django.urls import reverse
from django.http import HttpResponseRedirect, HttpResponse, HttpResponseBadRequest, HttpResponseForbidden, \
     HttpResponsePermanentRedirect
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.translation import gettext as _
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from saml2 import BINDING_HTTP_POST
from saml2.ident import code
from saml2.client import Saml2Client
from saml2.metadata import entity_descriptor
from djangosaml2.cache import IdentityCache, OutstandingQueriesCache
from djangosaml2.conf import get_config
from djangosaml2.views import LogoutView

from seaserv import ccnet_api, seafile_api

from seahub import auth
from seahub.api2.utils import get_api_token
from seahub.adfs_auth.backends import SSO_LDAP_USE_SAME_UID, LDAP_PROVIDER
from seahub.adfs_auth.utils import update_user_role, parse_user_attributes, sync_saml_groups
from seahub.auth import login as auth_login
from seahub.auth.decorators import login_required
from seahub import settings
from seahub.base.accounts import User
from seahub.auth.models import SocialAuthUser
from seahub.profile.models import Profile, DetailedProfile
from seahub.utils import render_error
from seahub.utils.auth import is_force_user_sso
from seahub.utils.licenseparse import user_number_over_limit
from seahub.adfs_auth.signals import saml_sso_failed
# Added by khorkin
from seahub.base.sudo_mode import update_sudo_mode_ts
try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED = False

SAML_PROVIDER_IDENTIFIER = getattr(settings, 'SAML_PROVIDER_IDENTIFIER', 'saml')
SAML_ATTRIBUTE_MAPPING = getattr(settings, 'SAML_ATTRIBUTE_MAPPING', {})
INTERNAL_SERVER_ERROR_MSG = _('Internal server error. Please contact system administrator.')
LOGIN_FAILED_ERROR_MSG = _('Login failed: Bad response from ADFS/SAML service. '
                               'Please report to your organization (company) administrator.')

logger = logging.getLogger('djangosaml2')

def _set_subject_id(session, subject_id):
    session['_saml2_subject_id'] = code(subject_id)


def get_org_admins(org):
    org_admins = list()
    org_users = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
    for user in org_users:
        if ccnet_api.is_org_staff(org.org_id, user.email):
            org_admins.append(user)
    return org_admins

    
def update_user_profile(user, attribute_mapping, attributes):
    parse_result = parse_user_attributes(attribute_mapping, attributes)
    display_name = parse_result.get('display_name', '')
    contact_email = parse_result.get('contact_email', '')
    telephone = parse_result.get('telephone', '')
    department = parse_result.get('department', '')

    # update profile
    p = Profile.objects.get_profile_by_user(user.username)
    if not p:
        p = Profile.objects.add_or_update(user.username, '')

    if display_name:
        p.nickname = display_name
    if contact_email:
        p.contact_email = contact_email

    p.save()

    # update detail_profile
    d_p = DetailedProfile.objects.get_detailed_profile_by_user(user.username)
    if not d_p:
        d_p = DetailedProfile.objects.add_detailed_profile(user.username, '', '')

    if department:
        d_p.department = department
    if telephone:
        d_p.telephone = telephone

    d_p.save()

    # update user role
    role = parse_result.get('role', '')
    update_user_role(user, role)
    
def _send_error_notifications(admins, error_msg):
    for admin in admins:
        saml_sso_failed.send(sender=None, to_user=admin.email, error_msg=error_msg)
    
def _handle_user_over_limit(request, org=None):
    # check user number limit by license
    if user_number_over_limit():
        logger.error('The number of users exceeds the license limit.')
        # send error msg to admin
        error_msg = 'The number of users exceeds the license limit.'
        admins = User.objects.get_superusers()
        for admin in admins:
            saml_sso_failed.send(sender=None, to_user=admin.email, error_msg=error_msg)
        return render_error(request, _("The number of users exceeds the limit."))
    
    # check user number limit by org member quota
    if org:
        org_members = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
        org_active_members = [member for member in org_members if member.is_active]
        org_active_members_count = len(org_active_members)
        if ORG_MEMBER_QUOTA_ENABLED:
            from seahub.organizations.models import OrgMemberQuota
            org_members_quota = OrgMemberQuota.objects.get_quota(org.org_id)
            if org_members_quota is not None and org_active_members_count >= org_members_quota:
                logger.error('The number of users exceeds the organization quota.')
                # send error msg to admin
                error_msg = 'The number of users exceeds the organization quota.'
                org_admins = get_org_admins(org)
                for org_admin in org_admins:
                    saml_sso_failed.send(sender=None, to_user=org_admin.email,
                                         error_msg=error_msg)
                return render_error(request, _("The number of users exceeds the limit."))

def _handle_acs_in_org(request, org_id):
    
    org_id = int(org_id)
    org = ccnet_api.get_org_by_id(org_id)
    if not org:
        logger.error('Cannot find an organization related to org_id %s.' % org_id)
        return render_error(request, INTERNAL_SERVER_ERROR_MSG)
    email_in_session = request.session.get('MULTI_SAML_EMAIL')
    try:
        del request.session['MULTI_SAML_EMAIL']
    except:
        pass
    
    if 'SAMLResponse' not in request.POST:
        logger.error('Missing "SAMLResponse" parameter in POST data.')
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        org_admins = get_org_admins(org)
        _send_error_notifications(org_admins, error_msg)
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    try:
        conf = get_config(None, request)
    except RuntimeError as e:
        logger.error(e)
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        org_admins = get_org_admins(org)
        _send_error_notifications(org_admins, error_msg)
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    except Exception as e:
        logger.error(e)
        return render_error(request, INTERNAL_SERVER_ERROR_MSG)
    
    identity_cache = IdentityCache(request.saml_session)
    client = Saml2Client(conf, identity_cache=identity_cache)
    oq_cache = OutstandingQueriesCache(request.saml_session)
    oq_cache.sync()
    outstanding_queries = oq_cache.outstanding_queries()
    
    xmlstr = request.POST['SAMLResponse']
    try:
        response = client.parse_authn_request_response(xmlstr,
                                                       BINDING_HTTP_POST,
                                                       outstanding_queries)
    except Exception as e:
        logger.error('SAMLResponse Error: %s' % e)
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        org_admins = get_org_admins(org)
        _send_error_notifications(org_admins, error_msg)
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    if response is None:
        logger.error('Invalid SAML Assertion received.')
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        if org:
            org_admins = get_org_admins(org)
            for org_admin in org_admins:
                saml_sso_failed.send(sender=None, to_user=org_admin.email, error_msg=error_msg)
        else:
            admins = User.objects.get_superusers()
            for admin in admins:
                saml_sso_failed.send(sender=None, to_user=admin.email, error_msg=error_msg)
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    session_id = response.session_id()
    oq_cache.delete(session_id)
    session_info = response.session_info()
    attribute_mapping = SAML_ATTRIBUTE_MAPPING
    if not attribute_mapping:
        logger.error('ADFS attribute mapping is not valid.')
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    # saml2 connect
    relay_state = request.POST.get('RelayState', '/saml2/complete/')
    is_saml2_connect = parse_qs(urlparse(unquote(relay_state)).query).get('is_saml2_connect', [''])[0]
    if is_saml2_connect == 'true':
        if not request.user.is_authenticated:
            return HttpResponseBadRequest(_('Failed to bind SAML, please login first.'))
        
        # get uid and other attrs from session_info
        name_id = session_info.get('name_id', '')
        if not name_id:
            logger.error('The name_id is not available. Could not determine user identifier.')
            return render_error(request, INTERNAL_SERVER_ERROR_MSG)
        
        name_id = name_id.text
        saml_user = SocialAuthUser.objects.get_by_provider_and_uid(SAML_PROVIDER_IDENTIFIER, name_id)
        if saml_user:
            logger.error('The SAML user has already been bound to another account.')
            return render_error(request, INTERNAL_SERVER_ERROR_MSG)
        
        # bind saml user
        username = request.user.username
        SocialAuthUser.objects.add(username, SAML_PROVIDER_IDENTIFIER, name_id)
        
        # update user's profile
        attributes = session_info.get('ava', {})
        if attributes:
            try:
                update_user_profile(request.user, attribute_mapping, attributes)
            except Exception as e:
                logger.warning('Failed to update user\'s profile, error: %s' % e)
        
        # set subject_id, saml single logout need this
        _set_subject_id(request.saml_session, session_info['name_id'])
        
        return HttpResponseRedirect(relay_state)
    
    if not session_info:
        logger.error('ADFS session info is not valid.')
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    name_id = session_info.get('name_id', '')
    if not name_id:
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    uid = name_id.text
    if not uid:
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    attributes = session_info.get('ava', {})
    user_attributes = parse_user_attributes(attribute_mapping, attributes)
    contact_email = user_attributes.get('contact_email') or ''
    
    # check contact_email in session
    if email_in_session != contact_email.lower():
        return render_error(request, _(
            'Login failed: The email %s is not consistent with the email %s from ADFS/SAML service' % (
                email_in_session, contact_email.lower())))
    
    saml_user = SocialAuthUser.objects.get_by_provider_and_uid(SAML_PROVIDER_IDENTIFIER, uid)
    if not saml_user and SSO_LDAP_USE_SAME_UID:
        saml_user = SocialAuthUser.objects.get_by_provider_and_uid(LDAP_PROVIDER, uid)
        if saml_user:
            SocialAuthUser.objects.add(saml_user.username, SAML_PROVIDER_IDENTIFIER, uid)
    
    if saml_user:
        username = saml_user.username
        is_new_user = False
    
    else:
        try:
            old_user = User.objects.get(email=uid)
        except User.DoesNotExist:
            old_user = None
        profile_user = Profile.objects.get_profile_by_contact_email(contact_email) if contact_email else None
        if old_user:
            username = old_user.username
            is_new_user = True
        elif profile_user:
            username = profile_user.user
            is_new_user = True
        else:
            username = None
            is_new_user = True
            over_limit_resp = _handle_user_over_limit(request, org)
            if over_limit_resp:
                return over_limit_resp
    
    if username and not ccnet_api.org_user_exists(org_id, username):
        return render_error(request, _('User not found in Team.'))
    
    logger.debug('Trying to authenticate the user')
    user = auth.authenticate(saml_username=username,
                             org_id=org_id)
    if user is None:
        logger.error('ADFS/SAML single sign-on failed: failed to create user.')
        # send error msg to admin
        error_msg = 'ADFS/SAML single sign-on failed: failed to create user.'
        org_admins = get_org_admins(org)
        _send_error_notifications(org_admins, error_msg)
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    username = user.username
    if is_new_user:
        SocialAuthUser.objects.add(username, SAML_PROVIDER_IDENTIFIER, uid)
    
    try:
        update_user_profile(user, attribute_mapping, attributes)
    except Exception as e:
        logger.warning('Failed to update user\'s profile, error: %s' % e)
    
    try:
        # update user groups
        seafile_groups = attributes.get('seafile_groups', [])
        sync_saml_groups(user, seafile_groups)
    except Exception as e:
        logger.warning('Failed to update user\'s groups, error: %s' % e)
    
    if not user.is_active:
        logger.error('ADFS/SAML single sign-on failed: user %s is deactivated.' % user.username)
        # send error msg to admin
        error_msg = 'ADFS/SAML single sign-on failed: user %s is deactivated.' % user.username
        org_admins = get_org_admins(org)
        _send_error_notifications(org_admins, error_msg)
        return HttpResponseForbidden(_('Login failed: user is deactivated. '
                                       'Please report to your organization (company) administrator.'))
    
    request.user = user
    auth_login(request, user)
    _set_subject_id(request.saml_session, session_info['name_id'])
    
    # redirect the user to the view where he came from
    default_relay_state = settings.LOGIN_REDIRECT_URL
    relay_state = request.POST.get('RelayState', default_relay_state)
    if not relay_state:
        logger.warning('The RelayState parameter exists but is empty')
        relay_state = default_relay_state
    logger.debug('Redirecting to the RelayState: %s', relay_state)
    
    api_token = get_api_token(request)
    response = HttpResponseRedirect(relay_state)
    response.set_cookie('seahub_auth', request.user.username + '@' + api_token.key)
    if user.is_authenticated and user.is_staff:
        update_sudo_mode_ts(request)
    
    return response


def _handle_acs(request):
    org_id = -1
    if 'SAMLResponse' not in request.POST:
        logger.error('Missing "SAMLResponse" parameter in POST data.')
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        admins = User.objects.get_superusers()
        _send_error_notifications(admins, error_msg)
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    try:
        conf = get_config(None, request)
    except RuntimeError as e:
        logger.error(e)
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        admins = User.objects.get_superusers()
        _send_error_notifications(admins, error_msg)
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    except Exception as e:
        logger.error(e)
        return render_error(request, INTERNAL_SERVER_ERROR_MSG)
    
    identity_cache = IdentityCache(request.saml_session)
    client = Saml2Client(conf, identity_cache=identity_cache)
    oq_cache = OutstandingQueriesCache(request.saml_session)
    oq_cache.sync()
    outstanding_queries = oq_cache.outstanding_queries()
    
    xmlstr = request.POST['SAMLResponse']
    try:
        response = client.parse_authn_request_response(xmlstr,
                                                       BINDING_HTTP_POST,
                                                       outstanding_queries)
    except Exception as e:
        logger.error('SAMLResponse Error: %s' % e)
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        admins = User.objects.get_superusers()
        _send_error_notifications(admins, error_msg)
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    if response is None:
        logger.error('Invalid SAML Assertion received.')
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        admins = User.objects.get_superusers()
        _send_error_notifications(admins, error_msg)
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    session_id = response.session_id()
    oq_cache.delete(session_id)
    session_info = response.session_info()
    attribute_mapping = SAML_ATTRIBUTE_MAPPING
    if not attribute_mapping:
        logger.error('ADFS attribute mapping is not valid.')
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    # saml2 connect
    relay_state = request.POST.get('RelayState', '/saml2/complete/')
    is_saml2_connect = parse_qs(urlparse(unquote(relay_state)).query).get('is_saml2_connect', [''])[0]
    if is_saml2_connect == 'true':
        if not request.user.is_authenticated:
            return HttpResponseBadRequest(_('Failed to bind SAML, please login first.'))
        
        # get uid and other attrs from session_info
        name_id = session_info.get('name_id', '')
        if not name_id:
            logger.error('The name_id is not available. Could not determine user identifier.')
            return render_error(request, INTERNAL_SERVER_ERROR_MSG)
        
        name_id = name_id.text
        saml_user = SocialAuthUser.objects.get_by_provider_and_uid(SAML_PROVIDER_IDENTIFIER, name_id)
        if saml_user:
            logger.error('The SAML user has already been bound to another account.')
            return render_error(request, INTERNAL_SERVER_ERROR_MSG)
        
        # bind saml user
        username = request.user.username
        SocialAuthUser.objects.add(username, SAML_PROVIDER_IDENTIFIER, name_id)
        
        # update user's profile
        attributes = session_info.get('ava', {})
        if attributes:
            try:
                update_user_profile(request.user, attribute_mapping, attributes)
            except Exception as e:
                logger.warning('Failed to update user\'s profile, error: %s' % e)
        
        # set subject_id, saml single logout need this
        _set_subject_id(request.saml_session, session_info['name_id'])
        
        return HttpResponseRedirect(relay_state)
    
    if not session_info:
        logger.error('ADFS session info is not valid.')
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    name_id = session_info.get('name_id', '')
    if not name_id:
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    uid = name_id.text
    if not uid:
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    attributes = session_info.get('ava', {})
    user_attributes = parse_user_attributes(attribute_mapping, attributes)
    contact_email = user_attributes.get('contact_email', '')
    
    saml_user = SocialAuthUser.objects.get_by_provider_and_uid(SAML_PROVIDER_IDENTIFIER, uid)
    if not saml_user and SSO_LDAP_USE_SAME_UID:
        saml_user = SocialAuthUser.objects.get_by_provider_and_uid(LDAP_PROVIDER, uid)
        if saml_user:
            SocialAuthUser.objects.add(saml_user.username, SAML_PROVIDER_IDENTIFIER, uid)
    
    if saml_user:
        username = saml_user.username
        is_new_user = False
    
    else:
        try:
            old_user = User.objects.get(email=uid)
        except User.DoesNotExist:
            old_user = None
        profile_user = Profile.objects.get_profile_by_contact_email(contact_email) if contact_email else None
        if old_user:
            username = old_user.username
            is_new_user = True
        elif profile_user:
            username = profile_user.user
            is_new_user = True
        else:
            username = None
            is_new_user = True
            # check user number limit by license
            over_limit_resp = _handle_user_over_limit(request)
            if over_limit_resp:
                return over_limit_resp
    
    logger.debug('Trying to authenticate the user')
    user = auth.authenticate(saml_username=username,
                             org_id=org_id)
    if user is None:
        logger.error('ADFS/SAML single sign-on failed: failed to create user.')
        # send error msg to admin
        error_msg = 'ADFS/SAML single sign-on failed: failed to create user.'
        admins = User.objects.get_superusers()
        _send_error_notifications(admins, error_msg)
        return render_error(request, LOGIN_FAILED_ERROR_MSG)
    
    username = user.username
    if is_new_user:
        SocialAuthUser.objects.add(username, SAML_PROVIDER_IDENTIFIER, uid)
    
    try:
        update_user_profile(user, attribute_mapping, attributes)
    except Exception as e:
        logger.warning('Failed to update user\'s profile, error: %s' % e)
    
    try:
        # update user groups
        seafile_groups = attributes.get('seafile_groups', [])
        sync_saml_groups(user, seafile_groups)
    except Exception as e:
        logger.warning('Failed to update user\'s groups, error: %s' % e)
    
    if not user.is_active:
        logger.error('ADFS/SAML single sign-on failed: user %s is deactivated.' % user.username)
        # send error msg to admin
        error_msg = 'ADFS/SAML single sign-on failed: user %s is deactivated.' % user.username
        admins = User.objects.get_superusers()
        _send_error_notifications(admins, error_msg)
        return HttpResponseForbidden(_('Login failed: user is deactivated. '
                                       'Please report to your organization (company) administrator.'))
    
    request.user = user
    auth_login(request, user)
    _set_subject_id(request.saml_session, session_info['name_id'])
    
    # redirect the user to the view where he came from
    default_relay_state = settings.LOGIN_REDIRECT_URL
    relay_state = request.POST.get('RelayState', default_relay_state)
    if not relay_state:
        logger.warning('The RelayState parameter exists but is empty')
        relay_state = default_relay_state
    logger.debug('Redirecting to the RelayState: %s', relay_state)
    
    api_token = get_api_token(request)
    response = HttpResponseRedirect(relay_state)
    response.set_cookie('seahub_auth', request.user.username + '@' + api_token.key)
    if user.is_authenticated and user.is_staff:
        update_sudo_mode_ts(request)
    
    return response
    

def login(request, org_id=None):
    org = None
    if org_id and int(org_id) > 0:
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            logger.error('Cannot find an organization related to org_id %s.' % org_id)
            return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))

    next_url = settings.LOGIN_REDIRECT_URL
    if 'next' in request.GET:
        next_url = request.GET['next']
    elif 'RelayState' in request.GET:
        next_url = request.GET['RelayState']

    if not url_has_allowed_host_and_scheme(next_url, None):
        next_url = settings.LOGIN_REDIRECT_URL

    try:
        sp_config = get_config(None, request)
    except RuntimeError as e:
        logger.error(e)
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        if org:
            org_admins = get_org_admins(org)
            for org_admin in org_admins:
                saml_sso_failed.send(sender=None, to_user=org_admin.email, error_msg=error_msg)
        else:
            admins = User.objects.get_superusers()
            for admin in admins:
                saml_sso_failed.send(sender=None, to_user=admin.email, error_msg=error_msg)
        return HttpResponseBadRequest(_('Login failed: ADFS/SAML service error. '
                                        'Please report to your organization (company) administrator.'))
    except Exception as e:
        logger.error(e)
        return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))

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
def assertion_consumer_service(request, org_id=None, attribute_mapping=None, create_unknown_user=True):
    """SAML Authorization Response endpoint.
    The IdP will send its response to this view, which will process it using pysaml2 and
    log the user in using whatever SAML authentication backend has been enabled in
    settings.py. The `djangosaml2.backends.Saml2Backend` can be used for this purpose,
    though some implementations may instead register their own subclasses of Saml2Backend.
    """
    if org_id and int(org_id) > 0:
        return _handle_acs_in_org(request, org_id)

    return _handle_acs(request)
    

def metadata(request, org_id=None):
    org = None
    if org_id and int(org_id) > 0:
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            logger.error('Cannot find an organization related to org_id %s.' % org_id)
            return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))

    try:
        sp_config = get_config(None, request)
    except RuntimeError as e:
        logger.error(e)
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        if org:
            org_admins = get_org_admins(org)
            for org_admin in org_admins:
                saml_sso_failed.send(sender=None, to_user=org_admin.email, error_msg=error_msg)
        else:
            admins = User.objects.get_superusers()
            for admin in admins:
                saml_sso_failed.send(sender=None, to_user=admin.email, error_msg=error_msg)
        return HttpResponseBadRequest(_('Login failed: ADFS/SAML service error. '
                                        'Please report to your organization (company) administrator.'))
    except Exception as e:
        logger.error(e)
        return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))

    sp_metadata = entity_descriptor(sp_config)
    return HttpResponse(
        content=str(sp_metadata).encode("utf-8"),
        content_type="text/xml; charset=utf-8",
    )


@login_required
def saml2_connect(request, org_id=None):
    org = None
    if org_id and int(org_id) > 0:
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            logger.error('Cannot find an organization related to org_id %s.' % org_id)
            return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))

        if request.user.org.org_id != org_id:
            logger.error('User %s does not belong to this organization: %s.' % (request.user.username, org.org_name))
            return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))

    next_url = settings.LOGIN_REDIRECT_URL
    if 'next' in request.GET:
        next_url = request.GET['next']
    elif 'RelayState' in request.GET:
        next_url = request.GET['RelayState']

    if not url_has_allowed_host_and_scheme(next_url, None):
        next_url = settings.LOGIN_REDIRECT_URL
    next_url = next_url + '?is_saml2_connect=true'

    try:
        sp_config = get_config(None, request)
    except RuntimeError as e:
        logger.error(e)
        # send error msg to admin
        error_msg = 'ADFS/SAML service error. Please check and fix the ADFS/SAML service.'
        if org:
            org_admins = get_org_admins(org)
            for org_admin in org_admins:
                saml_sso_failed.send(sender=None, to_user=org_admin.email, error_msg=error_msg)
        else:
            admins = User.objects.get_superusers()
            for admin in admins:
                saml_sso_failed.send(sender=None, to_user=admin.email, error_msg=error_msg)
        return HttpResponseBadRequest(_('Login failed: ADFS/SAML service error. '
                                        'Please report to your organization (company) administrator.'))
    except Exception as e:
        logger.error(e)
        return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))

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


@login_required
def saml2_disconnect(request, org_id=None):
    if org_id and int(org_id) > 0:
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            logger.error('Cannot find an organization related to org_id %s.' % org_id)
            return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))

        if request.user.org.org_id != org_id:
            logger.error('User %s does not belong to this organization: %s.' % (request.user.username, org.org_name))
            return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))
    
    username = request.user.username
    if request.user.enc_password == '!':
        return HttpResponseBadRequest(_('Failed to unbind SAML, please set a password first.'))
    
    if is_force_user_sso(request.user):
        return render_error(request, _('Failed to unbind SAML, the user is forced login by SSO.') )
        

    profile = Profile.objects.get_profile_by_user(username)
    if not profile or not profile.contact_email:
        return HttpResponseBadRequest(_('Failed to unbind SAML, please set a contact email first.'))

    SocialAuthUser.objects.delete_by_username_and_provider(username, SAML_PROVIDER_IDENTIFIER)
    next_url = request.GET.get(auth.REDIRECT_FIELD_NAME, settings.LOGIN_REDIRECT_URL)
    return HttpResponseRedirect(next_url)


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


# For compatibility with 10.0 version of URLs, replace url_prefix with org_id.
def adfs_compatible_view(request, url_prefix):
    try:
        org = ccnet_api.get_org_by_url_prefix(url_prefix)
    except Exception as e:
        logger.error(e)
        return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))

    if not org:
        logger.error('Cannot find an organization related to url_prefix %s.' % url_prefix)
        return HttpResponseBadRequest(_('Internal server error. Please contact system administrator.'))

    org_id = str(org.org_id)
    return HttpResponsePermanentRedirect(request.path.replace(url_prefix, org_id))


class SamlLogoutView(LogoutView):
    def do_logout_service(self, request, data, binding, *args, **kwargs):
        return super(SamlLogoutView, self).do_logout_service(request, data, binding)
