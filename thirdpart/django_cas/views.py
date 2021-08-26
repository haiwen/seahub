""" Django CAS 2.0 authentication login/logout replacement views """

from django.conf import settings
# from django.contrib import auth
from django.core.exceptions import PermissionDenied
from django.http import HttpResponseRedirect, HttpResponse, Http404
from django_cas.models import PgtIOU, SessionServiceTicket
from urllib.parse import urlencode
from urllib.parse import urljoin
from xml.dom import minidom
import logging
import types

from seahub import auth

__all__ = ['login', 'logout', 'proxy_callback']

logger = logging.getLogger(__name__)

# Work around for UnicodeEncodeErrors. 
def _fix_encoding(x):
    if isinstance(x, str):
        return x.encode('utf-8');
    return x


def _service(request):
    """ Returns service host URL as derived from request """

    return ('http://', 'https://')[request.is_secure()] + request.get_host()


def _service_url(request, redirect_to):
    """ Returns application service URL for CAS. """
    
    service = _service(request) + request.path

    params = {}
    if settings.CAS_GATEWAY:
        params.update({settings.CAS_GATEWAY_PARAM: '1'})
    if redirect_to:
        params.update({auth.REDIRECT_FIELD_NAME: redirect_to})

    if not params:
        return service
    else:
        return ''.join([service,
                        '?' if not '?' in service else '&',
                        urlencode(params)])


def _redirect_url(request):
    """ Redirects to referring page, or CAS_REDIRECT_URL if no referrer. """

    if request.GET.get(auth.REDIRECT_FIELD_NAME):
        return _fix_encoding(request.GET.get(auth.REDIRECT_FIELD_NAME))
    
    if settings.CAS_IGNORE_REFERER:
        return settings.CAS_REDIRECT_URL

    return _fix_encoding(request.META.get('HTTP_REFERER', settings.CAS_REDIRECT_URL))


def _login_url(service):
    """ Returns a CAS login URL. """

    params = {'service': service}
    if settings.CAS_RENEW:
        params.update({'renew': 'true'})
    elif settings.CAS_GATEWAY:
        params.update({'gateway': 'true'})
    if settings.CAS_EXTRA_LOGIN_PARAMS:
        params.update(settings.CAS_EXTRA_LOGIN_PARAMS)
    return urljoin(settings.CAS_SERVER_URL, 'login') + '?' + urlencode(params)


def _logout_url(request, next_page):
    """ Returns a CAS logout URL """

    logout_url = urljoin(settings.CAS_SERVER_URL, 'logout')
    if next_page:
        logout_url += '?' + urlencode({'url': _service(request) + next_page})

    return logout_url


def _single_sign_out(request):
    single_sign_out_request = request.POST.get('logoutRequest')
    request.session = _get_session(single_sign_out_request)
    request.user = auth.get_user(request)
    logger.debug("Got single sign out callback from CAS for user %s session %s", 
                 request.user, request.session.session_key)
    auth.logout(request)
    return HttpResponse()

    
def login(request):
    """ Forwards to CAS login URL or verifies CAS ticket. """

    if settings.CAS_SINGLE_SIGN_OUT and request.POST.get('logoutRequest'):
        return _single_sign_out(request)
        
    next_page = _redirect_url(request)

    if request.user.is_authenticated:
        return HttpResponseRedirect(next_page)

    service = _service_url(request, next_page)
    ticket = request.GET.get('ticket')

    if settings.CAS_GATEWAY and request.GET.get(settings.CAS_GATEWAY_PARAM) and not ticket:
        raise PermissionDenied()
    
    if not ticket:
        return HttpResponseRedirect(_login_url(service))
   
    user = auth.authenticate(ticket=ticket, service=service)

    if user is not None:
        auth.login(request, user)
        return HttpResponseRedirect(next_page)
    
    if settings.CAS_RETRY_LOGIN:
        return HttpResponseRedirect(_login_url(service))

    raise PermissionDenied("Login failed")
 

def _get_session(logout_response):
    """ Recovers the session mapped with the CAS service ticket
        received in the SAML CAS response at CAS logout.
    """
    try:
        response = minidom.parseString(logout_response)
        ticket = response.getElementsByTagName('samlp:SessionIndex')[0].firstChild.nodeValue
        sst = SessionServiceTicket.objects.get(pk=ticket)
        return sst.get_session()
    except SessionServiceTicket.DoesNotExist:
        logger.info("No session matching single sign out request: %s", ticket)        
    except Exception as e:
        logger.error("Unable to parse logout response from server: %s", e)
    raise Http404


def logout(request):
    """ Redirects to CAS logout page. """

    auth.logout(request)
    next_page = _redirect_url(request)
    if settings.CAS_LOGOUT_COMPLETELY:
        return HttpResponseRedirect(_logout_url(request, next_page))
    else:
        # This is in most cases pointless if not CAS_RENEW is set. The user will 
        # simply be logged in again on next request requiring authorization.
        return HttpResponseRedirect(next_page)


def proxy_callback(request):
    """Handles CAS 2.0+ XML-based proxy callback call.

        Stores the proxy granting ticket in the database for 
        future use.
    """
    pgtIou = request.GET.get('pgtIou')
    tgt = request.GET.get('pgtId')

    logger.debug("Got proxy callback from CAS server for pgt %s wiht pgtIou %s", tgt, pgtIou)

    if not (pgtIou and tgt):
        return HttpResponse()

    PgtIOU.objects.create(tgt = tgt, pgtIou = pgtIou)
    return HttpResponse()
