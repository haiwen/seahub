# Copyright (c) 2012-2016 Seafile Ltd.
from seahub.two_factor.models.base import Device, get_available_methods
from seahub.two_factor.models.totp import TOTPDevice
from seahub.two_factor.models.phone import PhoneDevice
from seahub.two_factor.models.static import StaticDevice, StaticToken

def devices_for_user(user):
    """
    Return an iterable of all devices registered to the given user.

    Returns an empty iterable for anonymous users.

    :param user: standard or custom user object.
    :type user: :class:`~seahub.auth.models.User`

    :rtype: iterable
    """
    if user.is_anonymous:
        return

    for model in TOTPDevice, PhoneDevice, StaticDevice:
        device = model.objects.device_for_user(user.username)
        if device:
            yield device

def user_has_device(user):
    """
    Return ``True`` if the user has at least one device.

    Returns ``False`` for anonymous users.

    :param user: standard or custom user object.
    :type user: :class:`~seahub.auth.models.User`

    """
    try:
        next(devices_for_user(user))
    except StopIteration:
        has_device = False
    else:
        has_device = True

    return has_device

def default_device(user):
    if not user or user.is_anonymous:
        return

    for device in devices_for_user(user):
        if device:
            return device

def match_token(user, token):
    """
    Attempts to verify a :term:`token` on every device attached to the given
    user until one of them succeeds. When possible, you should prefer to verify
    tokens against specific devices.

    :param user: The user supplying the token.
    :type user: :class:`~django.contrib.auth.models.User`

    :param string token: An OTP token to verify.

    :returns: The device that accepted ``token``, if any.
    :rtype: :class:`~django_otp.models.Device` or ``None``
    """
    matches = (d for d in devices_for_user(user) if d.verify_token(token))

    return next(matches, None)

########## handle signals
from django.dispatch import receiver
from seahub.auth.signals import user_logged_in
from seahub.two_factor import login

@receiver(user_logged_in)
def _handle_auth_login(sender, request, user, **kwargs):
    """
    Automatically persists an OTP device that was set by an OTP-aware
    AuthenticationForm.
    """
    if hasattr(user, 'otp_device'):
        login(request, user.otp_device)
