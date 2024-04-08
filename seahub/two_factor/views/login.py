# Copyright (c) 2012-2016 Seafile Ltd.
import hashlib
import re
import logging
from datetime import datetime
from importlib import import_module

from constance import config

from django.conf import settings
from django.urls import reverse
from django.http import HttpResponseRedirect, Http404
from django.utils.translation import gettext as _
from django.views.decorators.cache import never_cache
from django.contrib.sites.shortcuts import get_current_site
from django.shortcuts import redirect
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.debug import sensitive_post_parameters

from formtools.wizard.views import SessionWizardView


from seahub.auth import REDIRECT_FIELD_NAME, get_backends
from seahub.auth import login as auth_login
from seahub.base.accounts import User
from seahub.utils.ip import get_remote_ip

from seahub.profile.models import Profile

from seahub.two_factor import login as two_factor_login
from seahub.two_factor.models import (StaticDevice, TOTPDevice, default_device,
                                      user_has_device)

from seahub.two_factor.forms import TOTPTokenAuthForm, BackupTokenAuthForm, AuthenticationTokenForm
from seahub.two_factor.views.utils import class_view_decorator

from seahub.utils.auth import get_login_bg_image_path


# Get an instance of a logger
logger = logging.getLogger(__name__)

@class_view_decorator(sensitive_post_parameters())
@class_view_decorator(never_cache)
class TwoFactorVerifyView(SessionWizardView):
    """
    View for handling the login process, including OTP verification.

    The login process is composed like a wizard. The first step asks for the
    user's credentials. If the credentials are correct, the wizard proceeds to
    the OTP verification step. If the user has a default OTP device
    configured, that device is asked to generate a token and the user is asked
    to provide the generated token.
    """
    template_name = 'two_factor/core/login.html'
    storage_name = 'seahub.two_factor.views.utils.ExtraSessionStorage'

    form_list = (
        ('token', AuthenticationTokenForm),
        ('backup', BackupTokenAuthForm),
    )

    def has_token_step(self):
        return default_device(self.get_user_from_request(self.request))

    def has_backup_step(self):
        return StaticDevice.objects.device_for_user(self.user.username) and \
            not self.storage.get_step_data('token')

    # This class attribute must be defined after `has_token_step` and
    # `has_backup_step` methods because it makes use of them.
    condition_dict = {
        'token': has_token_step,
        'backup': has_backup_step,
    }
    redirect_field_name = REDIRECT_FIELD_NAME

    def __init__(self, **kwargs):
        super(TwoFactorVerifyView, self).__init__(**kwargs)
        self.user = None
        self.device_cache = None

    def reset_two_factor_session(self):
        for key in (SESSION_KEY_TWO_FACTOR_AUTH_USERNAME,
                    SESSION_KEY_TWO_FACTOR_REDIRECT_URL,
                    SESSION_KEY_TWO_FACTOR_FAILED_ATTEMPT):
            self.request.session.pop(key, '')

    def dispatch(self, request, *a, **kw):
        self.user = self.get_user_from_request(request)
        if not self.user:
            return HttpResponseRedirect(settings.LOGIN_URL)
        response = super(TwoFactorVerifyView, self).dispatch(request, *a, **kw)
        if self.request.session.get(SESSION_KEY_TWO_FACTOR_FAILED_ATTEMPT, 0) >= settings.LOGIN_ATTEMPT_LIMIT:
            self.reset_two_factor_session()
        return response

    def done(self, form_list, **kwargs):
        """
        Login the user and redirect to the desired page.
        """
        redirect_to = self.request.session.get(SESSION_KEY_TWO_FACTOR_REDIRECT_URL, '') \
                      or self.request.GET.get(self.redirect_field_name, '')

        auth_login(self.request, self.user)

        self.reset_two_factor_session()

        if not url_has_allowed_host_and_scheme(url=redirect_to, allowed_hosts=self.request.get_host()):
            redirect_to = str(settings.LOGIN_REDIRECT_URL)

        res = HttpResponseRedirect(redirect_to)
        if form_list[0].is_valid():
            remember_me = form_list[0].cleaned_data['remember_me']
            if remember_me:
                s = remember_device(self.user.username)
                res.set_cookie(
                    'S2FA', s.session_key,
                    max_age=settings.TWO_FACTOR_DEVICE_REMEMBER_DAYS * 24 * 60 * 60,
                    domain=settings.SESSION_COOKIE_DOMAIN,
                    path=settings.SESSION_COOKIE_PATH,
                    secure=settings.SESSION_COOKIE_SECURE or None,
                    httponly=settings.SESSION_COOKIE_HTTPONLY or None)
        return res

    def get_form_kwargs(self, step=None):
        if step in ('token', 'backup'):
            return {
                'user': self.user,
                'request': self.request,
            }
        return {}

    def get_device(self, step=None):
        """
        Returns the OTP device selected by the user, or his default device.
        """
        if not self.device_cache:
            if step == 'backup':
                try:
                    self.device_cache = StaticDevice.objects.get(
                        user=self.user.username, name='backup')
                except StaticDevice.DoesNotExist:
                    pass
            if not self.device_cache:
                self.device_cache = default_device(self.user)
        return self.device_cache

    def render(self, form=None, **kwargs):
        """
        If the user selected a device, ask the device to generate a challenge;
        either making a phone call or sending a text message.
        """
        if self.steps.current == 'token':
            self.get_device().generate_challenge()
        return super(TwoFactorVerifyView, self).render(form, **kwargs)

    def get_user_from_request(self, request):
        username = request.session.get(SESSION_KEY_TWO_FACTOR_AUTH_USERNAME, None)
        if not username:
            return None
        username = Profile.objects.get_username_by_login_id(username) or username
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            self.request.session.pop(SESSION_KEY_TWO_FACTOR_AUTH_USERNAME, '')
            return None
        for backend in get_backends():
            user.backend = "%s.%s" % (backend.__module__, backend.__class__.__name__)
        return user

    def get_context_data(self, form, **kwargs):
        """
        Adds user's default and backup OTP devices to the context.
        """
        context = super(TwoFactorVerifyView, self).get_context_data(form, **kwargs)
        if self.steps.current == 'token':
            context['device'] = self.get_device()
            device = StaticDevice.objects.device_for_user(self.user.username)
            context['backup_tokens'] = device.token_set.count() if device else 0

        context['cancel_url'] = '/accounts/logout/'
        context['form_prefix'] = '%s-' % self.steps.current
        login_bg_image_path = get_login_bg_image_path()
        context['login_bg_image_path'] = login_bg_image_path
        context['remember_days'] = settings.TWO_FACTOR_DEVICE_REMEMBER_DAYS

        return context

    def render_done(self, form, **kwargs):
        final_form_list = []
        # walk through the form list and try to validate the data again.
        for form_key in self.get_form_list():
            form_obj = self.get_form(
                step=form_key,
                data=self.storage.get_step_data(form_key),
                files=self.storage.get_step_files(
                    form_key)
            )
            final_form_list.append(form_obj)

        done_response = self.done(final_form_list, **kwargs)
        self.storage.reset()
        return done_response

def two_factor_auth_enabled(user):
    return config.ENABLE_TWO_FACTOR_AUTH and user_has_device(user)

SESSION_KEY_TWO_FACTOR_AUTH_USERNAME = '2fa-username'
SESSION_KEY_TWO_FACTOR_REDIRECT_URL = '2fa-redirect-url'
SESSION_KEY_TWO_FACTOR_FAILED_ATTEMPT = '2fa-failed-attempt'
def handle_two_factor_auth(request, user, redirect_to):
    request.session[SESSION_KEY_TWO_FACTOR_AUTH_USERNAME] = user.username
    request.session[SESSION_KEY_TWO_FACTOR_REDIRECT_URL] = redirect_to
    request.session[SESSION_KEY_TWO_FACTOR_FAILED_ATTEMPT] = 0
    return redirect(reverse('two_factor_auth'))

def verify_two_factor_token(user, token):
    """
    This function is called when doing the api authentication.
    Backup token is not supported, because if the user has the backup token,
    he can always login the website and re-setup the totp.
    """
    device = default_device(user)
    if device:
        return device.verify_token(token)

def remember_device(s_data):
    SessionStore = import_module(settings.SESSION_ENGINE).SessionStore
    s = SessionStore()
    s.set_expiry(settings.TWO_FACTOR_DEVICE_REMEMBER_DAYS * 24 * 60 * 60)
    s['2fa-skip'] = s_data
    s.create()
    return s

def is_device_remembered(request_header, user):
    if not request_header:
        return False

    # User must be authenticated, otherwise this function is wrong used.
    assert user.is_authenticated

    SessionStore = import_module(settings.SESSION_ENGINE).SessionStore
    s = SessionStore(request_header)
    try:
        username = s['2fa-skip']
        return username == user.username
    except KeyError:
        return False
