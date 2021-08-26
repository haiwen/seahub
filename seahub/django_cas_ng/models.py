# ⁻*- coding: utf-8 -*-
from django.db import models
from django.conf import settings
from .utils import (get_cas_client, get_user_from_session)

from importlib import import_module

import django

from seahub.base.fields import LowerCaseCharField

SessionStore = import_module(settings.SESSION_ENGINE).SessionStore

from django.conf import settings as django_settings
if getattr(django_settings, 'ENABLE_CAS', False):
    from cas import CASError

class ProxyError(ValueError):
    pass


class ProxyGrantingTicket(models.Model):
    class Meta:
        unique_together = ('session_key', 'user')
    session_key = models.CharField(max_length=255, blank=True, null=True)
    user = LowerCaseCharField(max_length=255, db_index=True)
    pgtiou = models.CharField(max_length=255, null=True, blank=True)
    pgt = models.CharField(max_length=255, null=True, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    @classmethod
    def clean_deleted_sessions(cls):
        for pgt in cls.objects.all():
            session = SessionStore(session_key=pgt.session_key)
            user = get_user_from_session(session)
            if django.VERSION[0] < 2:
                if not user.is_authenticated:
                    pgt.delete()
            else:
                if not user.is_authenticated:
                    pgt.delete()

    @classmethod
    def retrieve_pt(cls, request, service):
        """`request` should be the current HttpRequest object
        `service` a string representing the service for witch we want to
        retrieve a ticket.
        The function return a Proxy Ticket or raise `ProxyError`
        """
        try:
            pgt = cls.objects.get(user=request.user.username,
                                  session_key=request.session.session_key).pgt
        except cls.DoesNotExist:
            raise ProxyError(
                "INVALID_TICKET",
                "No proxy ticket found for this HttpRequest object"
            )
        else:
            client = get_cas_client(service_url=service, request=request)
            try:
                return client.get_proxy_ticket(pgt)
            # change CASError to ProxyError nicely
            except CASError as error:
                raise ProxyError(*error.args)
            # just embed other errors
            except Exception as e:
                raise ProxyError(e)


class SessionTicket(models.Model):
    session_key = models.CharField(max_length=255)
    ticket = models.CharField(max_length=255)

    @classmethod
    def clean_deleted_sessions(cls):
        for st in cls.objects.all():
            session = SessionStore(session_key=st.session_key)
            user = get_user_from_session(session)
            if django.VERSION[0] < 2:
                if not user.is_authenticated:
                    st.delete()
            else:
                if not user.is_authenticated:
                    st.delete()
