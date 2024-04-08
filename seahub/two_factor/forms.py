# Copyright (c) 2012-2016 Seafile Ltd.
from binascii import unhexlify
from time import time

from django import forms
from django.forms import ModelForm, Form
from django.utils.translation import gettext_lazy as _

from seahub.two_factor.oath import totp
from seahub.two_factor.models import (Device, TOTPDevice, StaticDevice,
                                      PhoneDevice, devices_for_user, match_token)

from .models import get_available_methods
from .utils import totp_digits


class MethodForm(forms.Form):
    method = forms.ChoiceField(label="Method",
                               initial='generator',
                               widget=forms.RadioSelect)

    def __init__(self, **kwargs):
        super(MethodForm, self).__init__(**kwargs)
        self.fields['method'].choices = get_available_methods()


class PhoneNumberForm(ModelForm):
    # Cannot use PhoneNumberField, as it produces a PhoneNumber object, which cannot be serialized.
    number = forms.CharField(label="Phone Number"
                             #validators=[validate_international_phonenumber]
    )

    class Meta:
        model = PhoneDevice
        fields = 'number',


class DeviceValidationForm(forms.Form):
    token = forms.IntegerField(label=_("Token"), min_value=1, max_value=int('9' * totp_digits()))

    error_messages = {
        'invalid_token': 'Entered token is not valid.',
    }

    def __init__(self, device, **args):
        super(DeviceValidationForm, self).__init__(**args)
        self.device = device

    def clean_token(self):
        token = self.cleaned_data['token']
        if not self.device.verify_token(token):
            raise forms.ValidationError(self.error_messages['invalid_token'])
        return token


class TOTPDeviceForm(forms.Form):
    """
    This form is used when the user enables the token generator. The user is
    asked to scan the QR code (with a mobile phone app like google
    authenticator) and provide the current token.
    """

    token = forms.IntegerField(label=_("Token"), min_value=0, max_value=int('9' * totp_digits()))

    error_messages = {
        'invalid_token': 'Entered token is not valid.',
    }

    def __init__(self, key, user, metadata=None, **kwargs):
        super(TOTPDeviceForm, self).__init__(**kwargs)
        self.key = key
        self.tolerance = 1
        self.t0 = 0
        self.step = 30
        self.drift = 0
        self.digits = totp_digits()
        self.user = user
        self.metadata = metadata or {}

    @property
    def bin_key(self):
        """
        The secret key as a binary string.
        """
        return unhexlify(self.key.encode())

    def clean_token(self):
        token = self.cleaned_data.get('token')
        validated = False
        t0s = [self.t0]
        key = self.bin_key
        if 'valid_t0' in self.metadata:
            t0s.append(int(time()) - self.metadata['valid_t0'])
        for t0 in t0s:
            for offset in range(-self.tolerance, self.tolerance):
                if totp(key, self.step, t0, self.digits, self.drift + offset) == token:
                    self.drift = offset
                    self.metadata['valid_t0'] = int(time()) - t0
                    validated = True
        if not validated:
            raise forms.ValidationError(self.error_messages['invalid_token'])
        return token

    def save(self):
        return TOTPDevice.objects.create(user=self.user.username, key=self.key,
                                         tolerance=self.tolerance, t0=self.t0,
                                         step=self.step, drift=self.drift,
                                         digits=self.digits)


class DisableForm(forms.Form):
    """
    Asks for confirmation when the user disables 2fa in profile page.
    """
    # understand = forms.BooleanField(label=_("Yes, I am sure"))
    pass


class BaseOTPAuthenticationForm(Form):

    SESSION_KEY_TWO_FACTOR_FAILED_ATTEMPT = '2fa-failed-attempt'

    def __init__(self, user, request, **kwargs):
        super(BaseOTPAuthenticationForm, self).__init__(**kwargs)
        self.user = user
        self.request = request

    def clean(self):
        self.clean_otp(self.user)
        return self.cleaned_data

    def clean_otp(self, user):
        """
        Processes the ``otp_*`` fields.

        :param user: A user that has been authenticated by the first factor
            (such as a password).
        :type user: :class:`~seahub.auth.models.User`
        :rasies: :exc:`~django.core.exceptions.ValidationError` if the user is
            not fully authenticated by an OTP token.
        """
        if user is None:
            return

        user.otp_device = None
        token = self.cleaned_data.get('otp_token')
        if token:
            user.otp_device = self._verify_token(user, token)
        if user.otp_device is None:
            raise forms.ValidationError('Please enter your OTP token')

    def _verify_token(self, user, token):
        device = self.device_model.objects.device_for_user(user.username)
        if device and device.verify_token(token):
            return device

    def is_valid(self):
        ret = super(BaseOTPAuthenticationForm, self).is_valid()
        if not ret:
            failed_attempt = self.request.session.get(self.SESSION_KEY_TWO_FACTOR_FAILED_ATTEMPT, 0)
            self.request.session[self.SESSION_KEY_TWO_FACTOR_FAILED_ATTEMPT] = failed_attempt + 1
        return ret


class TOTPTokenAuthForm(BaseOTPAuthenticationForm):
    device_model = TOTPDevice
    otp_token = forms.IntegerField(label=_("Token"), min_value=1,
                                   max_value=int('9' * totp_digits()))


class BackupTokenAuthForm(BaseOTPAuthenticationForm):
    device_model = StaticDevice
    otp_token = forms.CharField(label=_("Token"), min_length=3)


class OTPAuthenticationFormMixin(object):
    """
    Shared functionality for
    :class:`~django.contrib.auth.forms.AuthenticationForm` subclasses that wish
    to handle OTP tokens. Subclasses must do the following in order to use
    this:

        #. Define three additional form fields::

            otp_device = forms.CharField(required=False, widget=forms.Select)
            otp_token = forms.CharField(required=False)
            otp_challenge = forms.CharField(required=False)

           - ``otp_device`` will be a select widget with all of the user's
             devices listed. Until the user has entered a valid username and
             password, this will be empty and may be omitted.
           - ``otp_token`` is where the user will enter their token.
           - ``otp_challenge`` is a placeholder field that captures an
             alternate submit button of the same name.

        #. Override :meth:`~django.forms.Form.clean` to call :meth:`clean_otp`
           after invoking the inherited :meth:`~django.forms.Form.clean`. See
           :class:`OTPAuthenticationForm` for an example.

        #. See :class:`OTPAuthenticationForm` for information about writing a
           login template for this form. The file
           ``django_otp/templates/otp/admin/login.html`` is also a useful
           example.

    You will most likely be able to use :class:`OTPAuthenticationForm`,
    :class:`django_otp.admin.OTPAdminAuthenticationForm`, or
    :class:`OTPTokenForm` directly. If these do not suit your needs--for
    instance if your primary authentication is not by password--they should
    serve as useful examples.
    """
    def clean_otp(self, user):
        """
        Processes the ``otp_*`` fields.

        :param user: A user that has been authenticated by the first factor
            (such as a password).
        :type user: :class:`~django.contrib.auth.models.User`
        :rasies: :exc:`~django.core.exceptions.ValidationError` if the user is
            not fully authenticated by an OTP token.
        """
        if user is None:
            return

        device = self._chosen_device(user)
        token = self.cleaned_data.get('otp_token')
        error = None

        user.otp_device = None

        if self.cleaned_data.get('otp_challenge'):
            error = self._handle_challenge(device)
        elif token:
            user.otp_device = self._verify_token(user, token, device)

        if user.otp_device is None:
            self._update_form(user)

            if error is None:
                error = forms.ValidationError('Please enter your OTP token')

            raise error

    def _chosen_device(self, user):
        device_id = self.cleaned_data.get('otp_device')

        if device_id:
            device = Device.from_persistent_id(device_id)
        else:
            device = None

        # SECURITY: The form doesn't validate otp_device for us, since we don't
        # have the list of choices until we authenticate the user. Without the
        # following, an attacker could authenticate using some other user's OTP
        # device.
        if (device is not None) and (device.user_id != user.id):
            device = None

        return device

    def _handle_challenge(self, device):
        try:
            challenge = device.generate_challenge() if (device is not None) else None
        except Exception as e:
            error = forms.ValidationError('Error generating challenge: {0}'.format(e))
        else:
            if challenge is None:
                error = forms.ValidationError('The selected OTP device is not interactive')
            else:
                error = forms.ValidationError('OTP Challenge: {0}'.format(challenge))

        return error

    def _verify_token(self, user, token, device=None):
        if device is not None:
            device = device if device.verify_token(token) else None
        else:
            device = match_token(user, token)

        return device

    def _update_form(self, user):
        if 'otp_device' in self.fields:
            self.fields['otp_device'].widget.choices = self.device_choices(user)

        if 'password' in self.fields:
            self.fields['password'].widget.render_value = True

    @staticmethod
    def device_choices(user):
        return list((d.persistent_id, d.name) for d in devices_for_user(user))


class AuthenticationTokenForm(OTPAuthenticationFormMixin, Form):

    SESSION_KEY_TWO_FACTOR_FAILED_ATTEMPT = '2fa-failed-attempt'

    otp_token = forms.IntegerField(label=_("Token"), min_value=1,
                                   max_value=int('9' * totp_digits()))
    remember_me = forms.BooleanField(required=False)

    def __init__(self, user, request=None, *args, **kwargs):
        """
        `initial_device` is either the user's default device, or the backup
        device when the user chooses to enter a backup token. The token will
        be verified against all devices, it is not limited to the given
        device.
        """
        super(AuthenticationTokenForm, self).__init__(**kwargs)
        self.user = user
        self.request = request

    def clean(self):
        self.clean_otp(self.user)
        return self.cleaned_data

    def is_valid(self):
        ret = super(Form, self).is_valid()
        if not ret:
            failed_attempt = self.request.session.get(self.SESSION_KEY_TWO_FACTOR_FAILED_ATTEMPT, 0)
            self.request.session[self.SESSION_KEY_TWO_FACTOR_FAILED_ATTEMPT] = failed_attempt + 1
        return ret
