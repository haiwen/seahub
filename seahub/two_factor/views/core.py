# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from binascii import unhexlify
from base64 import b32encode

from constance import config
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse
from django.forms import Form
from django.http import HttpResponse, Http404, HttpResponseRedirect
from django.shortcuts import redirect
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.module_loading import import_string
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from django.views.generic import FormView, DeleteView, TemplateView
from django.views.generic.base import View

import qrcode
import qrcode.image.svg

from seahub.auth import login as login, REDIRECT_FIELD_NAME
from seahub.auth.decorators import login_required
from seahub.auth.forms import AuthenticationForm

from seahub.two_factor import login as two_factor_login
from seahub.two_factor.decorators import otp_required
from seahub.two_factor.models import (StaticDevice, PhoneDevice,
                                      get_available_methods, default_device)
from seahub.two_factor.utils import random_hex, totp_digits, get_otpauth_url

from seahub.two_factor.forms import (MethodForm, TOTPDeviceForm,
                                           PhoneNumberForm, DeviceValidationForm)
from seahub.two_factor.views.utils import (class_view_decorator,
                                                 CheckTwoFactorEnabledMixin,
                                                 IdempotentSessionWizardView)

logger = logging.getLogger(__name__)

QR_SESSION_KEY = 'django_two_factor-qr_secret_key'

@class_view_decorator(never_cache)
@class_view_decorator(login_required)
class SetupView(CheckTwoFactorEnabledMixin, IdempotentSessionWizardView):

    redirect_url = 'two_factor:backup_tokens'
    qrcode_url = 'two_factor:qr'
    template_name = 'two_factor/core/setup.html'
    initial_dict = {}
    form_list = (
        # ('welcome', Form),
        ('method', MethodForm),
        ('generator', TOTPDeviceForm),
        ('sms', PhoneNumberForm),
        ('call', PhoneNumberForm),
        ('validation', DeviceValidationForm),
    )
    condition_dict = {
        'generator': lambda self: self.get_method() == 'generator',
        'call': lambda self: self.get_method() == 'call',
        'sms': lambda self: self.get_method() == 'sms',
        'validation': lambda self: self.get_method() in ('sms', 'call'),
    }

    def get_method(self):
        method_data = self.storage.validated_step_data.get('method', {})
        return method_data.get('method', None)

    def get(self, request, *args, **kwargs):
        """
        Start the setup wizard. Redirect if already enabled.
        """
        if default_device(self.request.user):
            return redirect(self.redirect_url)
        return super(SetupView, self).get(request, *args, **kwargs)

    def get_form_list(self):
        """
        Check if there is only one method, then skip the MethodForm from form_list
        """
        form_list = super(SetupView, self).get_form_list()
        available_methods = get_available_methods()
        if len(available_methods) == 1:
            form_list.pop('method', None)

            # XXX: since we comment out first welcome step, `form_list` will
            # be empty after pop 'method', which will cause index error in
            # `WizardView::get` when reset to the first step, so we have to
            # add our default method to the form list.
            if len(form_list) == 0:
                form_list['generator'] = TOTPDeviceForm

            method_key, _ = available_methods[0]
            self.storage.validated_step_data['method'] = {'method': method_key}
        return form_list

    def render_next_step(self, form, **kwargs):
        """
        In the validation step, ask the device to generate a challenge.
        """
        next_step = self.steps.__next__
        if next_step == 'validation':
            try:
                self.get_device().generate_challenge()
                kwargs["challenge_succeeded"] = True
            except:
                logger.exception("Could not generate challenge")
                kwargs["challenge_succeeded"] = False
        return super(SetupView, self).render_next_step(form, **kwargs)

    def done(self, form_list, **kwargs):
        """
        Finish the wizard. Save all forms and redirect.
        """
        # TOTPDeviceForm
        if self.get_method() == 'generator':
            form = [form for form in form_list if isinstance(form, TOTPDeviceForm)][0]
            device = form.save()

        # PhoneNumberForm / YubiKeyDeviceForm
        elif self.get_method() in ('call', 'sms', 'yubikey'):
            device = self.get_device()
            device.save()

        else:
            raise NotImplementedError("Unknown method '%s'" % self.get_method())

        two_factor_login(self.request, device)

        device = StaticDevice.get_or_create(self.request.user.username)
        if device.token_set.count() == 0:
            device.generate_tokens()

        return redirect(self.redirect_url)

    def get_form_kwargs(self, step=None):
        kwargs = {}
        if step == 'generator':
            kwargs.update({
                'key': self.get_key(step),
                'user': self.request.user,
            })
        if step in ('validation', 'yubikey'):
            kwargs.update({
                'device': self.get_device()
            })
        metadata = self.get_form_metadata(step)
        if metadata:
            kwargs.update({'metadata': metadata, })
        return kwargs

    def get_device(self, **kwargs):
        """
        Uses the data from the setup step and generated key to recreate device.

        Only used for call / sms -- generator uses other procedure.
        """
        method = self.get_method()
        kwargs = kwargs or {}
        kwargs['name'] = 'default'
        kwargs['user'] = self.request.user

        if method in ('call', 'sms'):
            kwargs['method'] = method
            kwargs['number'] = self.storage.validated_step_data\
                .get(method, {}).get('number')
            return PhoneDevice(key=self.get_key(method), **kwargs)

    def get_key(self, step):
        self.storage.extra_data.setdefault('keys', {})
        if step in self.storage.extra_data['keys']:
            return self.storage.extra_data['keys'].get(step)
        key = random_hex(20).decode('ascii')
        self.storage.extra_data['keys'][step] = key
        return key

    def get_context_data(self, form, **kwargs):
        context = super(SetupView, self).get_context_data(form, **kwargs)
        if self.steps.current == 'generator':
            key = self.get_key('generator')
            rawkey = unhexlify(key.encode('ascii'))
            b32key = b32encode(rawkey).decode('utf-8')
            self.request.session[QR_SESSION_KEY] = b32key
            context.update({'QR_URL': reverse(self.qrcode_url)})
        elif self.steps.current == 'validation':
            context['device'] = self.get_device()
        context['cancel_url'] = reverse('edit_profile')
        return context

    def process_step(self, form):
        if hasattr(form, 'metadata'):
            self.storage.extra_data.setdefault('forms', {})
            self.storage.extra_data['forms'][
                self.steps.current] = form.metadata
        return super(SetupView, self).process_step(form)

    def get_form_metadata(self, step):
        self.storage.extra_data.setdefault('forms', {})
        return self.storage.extra_data['forms'].get(step, None)


@class_view_decorator(never_cache)
@class_view_decorator(otp_required)
class BackupTokensView(CheckTwoFactorEnabledMixin, FormView):
    """
    View for listing and generating backup tokens.

    A user can generate a number of static backup tokens. When the user loses
    its phone, these backup tokens can be used for verification. These backup
    tokens should be stored in a safe location; either in a safe or underneath
    a pillow ;-).
    """
    form_class = Form
    redirect_url = 'two_factor:backup_tokens'
    template_name = 'two_factor/core/backup_tokens.html'
    number_of_tokens = 10

    def get_device(self):
        return StaticDevice.get_or_create(self.request.user.username)

    def get_context_data(self, **kwargs):
        context = super(BackupTokensView, self).get_context_data(**kwargs)
        context['device'] = self.get_device()
        return context

    def form_valid(self, form):
        """
        Delete existing backup codes and generate new ones.
        """
        device = self.get_device()
        device.token_set.all().delete()
        device.generate_tokens()

        return redirect(self.redirect_url)


@class_view_decorator(never_cache)
@class_view_decorator(otp_required)
class SetupCompleteView(CheckTwoFactorEnabledMixin, TemplateView):
    """
    View congratulation the user when OTP setup has completed.
    """
    template_name = 'two_factor/core/setup_complete.html'

    def get_context_data(self):
        return {'phone_methods': [], }


@class_view_decorator(never_cache)
@class_view_decorator(login_required)
class QRGeneratorView(View):
    """
    View returns an SVG image with the OTP token information
    """
    http_method_names = ['get']
    default_qr_factory = 'qrcode.image.svg.SvgPathImage'

    # The qrcode library only supports PNG and SVG for now
    image_content_types = {
        'PNG': 'image/png',
        'SVG': 'image/svg+xml; charset=utf-8',
    }

    def get(self, request, *args, **kwargs): # pylint: disable=unused-argument
        # Get the data from the session
        if not config.ENABLE_TWO_FACTOR_AUTH:
            raise Http404()
        try:
            key = self.request.session[QR_SESSION_KEY]
            del self.request.session[QR_SESSION_KEY]
        except KeyError:
            raise Http404()

        # Get data for qrcode
        image_factory_string = getattr(settings, 'TWO_FACTOR_QR_FACTORY',
                                       self.default_qr_factory)
        image_factory = import_string(image_factory_string)
        content_type = self.image_content_types[image_factory.kind]

        otpauth_url = get_otpauth_url(
            accountname=self.request.user.username,
            issuer=config.SITE_NAME,
            secret=key,
            digits=totp_digits())

        # Make and return QR code
        img = qrcode.make(otpauth_url, image_factory=image_factory)
        resp = HttpResponse(content_type=content_type)
        img.save(resp)
        return resp
