""" Django CAS 2.0 authentication models """

from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import BACKEND_SESSION_KEY
# from django.contrib.auth.models import User
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.contrib.sessions.models import Session
from django.core.exceptions import ImproperlyConfigured
from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch.dispatcher import receiver
from django.utils.translation import ugettext_lazy as _
from django_cas.exceptions import CasTicketException
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.parse import urljoin
from xml.dom import minidom

from seahub.base.accounts import User

__all__ = ['Tgt']

class Tgt(models.Model):
    """
    Model representing CAS ticket granting tickets. It can be used
    to retrieve proxy granting tickets for backend web services 
    """
    username = models.CharField(_('username'), max_length = 255, unique = True)
    tgt = models.CharField(_('ticket granting ticket'), max_length = 255)
    
    class Meta:
        db_table = 'django_cas_tgt'
        verbose_name = _('ticket granting ticket')
        verbose_name_plural = _('ticket granting tickets')


    @classmethod
    def get_tgt_for_user(self, user):
        """
        Returns the ticket granting ticket stored for a user in the database.

        The user can be specified as a User object or its Django username.
        Raises Tgt.DoesNotExist if the ticket can't be found.
        """
        if isinstance(user, User):
            return Tgt.objects.get(username = user.username)
        return Tgt.objects.get(username = user)


    def get_proxy_ticket_for_service(self, service):
        """
        Returns a string representing a proxy ticket for the given service as
        given by the CAS server. This ticket can then be used to authenticate
        to the backend service, typically in a 'ticket' parameter, but may
        be in other manners detailed by the service specification.
        """
        if not settings.CAS_PROXY_CALLBACK:
            raise ImproperlyConfigured("No proxy callback set in settings")

        params = {'pgt': self.tgt, 'targetService': service}
        page = urlopen(urljoin(settings.CAS_SERVER_URL, 'proxy') + '?' + urlencode(params))

        try:
            response = minidom.parseString(page.read())
            if response.getElementsByTagName('cas:proxySuccess'):
                return response.getElementsByTagName('cas:proxyTicket')[0].firstChild.nodeValue
            raise CasTicketException("Failed to get proxy ticket")
        finally:
            page.close()


class PgtIOU(models.Model):
    """ Proxy granting ticket and IOU """
    pgtIou = models.CharField(_('proxy ticket IOU'), max_length = 255, unique = True)
    tgt = models.CharField(_('ticket granting ticket'), max_length = 255)
    timestamp = models.DateTimeField(auto_now = True)

    class Meta:
        db_table = 'django_cas_pgtiou'
        verbose_name = _('proxy ticket IOU')
        verbose_name_plural = _('proxy ticket IOUs')


class SessionServiceTicket(models.Model):
    """ Handles a mapping between the CAS Service Ticket and the session key
        as long as user is connected to an application that uses the CASBackend
        for authentication
    """
    service_ticket = models.CharField(_('service ticket'), max_length=255, primary_key=True)
    session_key = models.CharField(_('session key'), max_length=40)


    class Meta:
        db_table = 'django_cas_session_service_ticket'
        verbose_name = _('session service ticket')
        verbose_name_plural = _('session service tickets')


    def get_session(self):
        """ Searches the session in store and returns it """
        session_engine = __import__(name=settings.SESSION_ENGINE, fromlist=['SessionStore'])
        SessionStore = getattr(session_engine, 'SessionStore')
        return SessionStore(session_key=self.session_key)


    def __unicode__(self):
        return self.ticket


def _is_cas_backend(session):
    """ Checks if the auth backend is CASBackend """
    backend = session.get(BACKEND_SESSION_KEY)
    from django_cas.backends import CASBackend
    return backend == '{0.__module__}.{0.__name__}'.format(CASBackend)


@receiver(user_logged_in)
def map_service_ticket(sender, **kwargs):
    """ Creates the mapping between a session key and a service ticket after user
        logged in """
    request = kwargs['request']
    ticket = request.GET.get('ticket')
    if settings.CAS_SINGLE_SIGN_OUT and ticket and _is_cas_backend(request.session):
        session_key = request.session.session_key
        SessionServiceTicket.objects.create(service_ticket=ticket,
                                            session_key=session_key)


@receiver(user_logged_out)
def delete_service_ticket(sender, **kwargs):
    """ Deletes the mapping between session key and service ticket after user
        logged out """
    request = kwargs['request']
    if settings.CAS_SINGLE_SIGN_OUT and _is_cas_backend(request.session):
        session_key = request.session.session_key
        SessionServiceTicket.objects.filter(session_key=session_key).delete()


@receiver(post_delete, sender=Session)
def delete_old_session_service_tickets(sender, instance, **kwargs):
    """ Deletes session service tickets when mapped sessions are deleted 
        from the database. Note that this does not catch the case with
        cached sessions that are not mapped to ordinary Django models.
        
        You have to run the django-admin command purge_session_service_tickets
        if you don't have sessions mapped to the database.
    """
    if settings.CAS_SINGLE_SIGN_OUT:
        SessionServiceTicket.objects.filter(session_key=instance.session_key).delete()


@receiver(post_save, sender=PgtIOU)
def delete_old_tickets(**kwargs):
    """ Delete tickets if they are over 2 days old 
        kwargs = ['raw', 'signal', 'instance', 'sender', 'created']
    """
    sender = kwargs.get('sender')
    now = datetime.now()
    expire = datetime(now.year, now.month, now.day) - timedelta(days=2)
    sender.objects.filter(timestamp__lt=expire).delete()
