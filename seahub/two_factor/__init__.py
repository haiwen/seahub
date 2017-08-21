# Copyright (c) 2012-2016 Seafile Ltd.
import sys

from seahub.auth.signals import user_logged_in
from seahub.two_factor.models import (StaticDevice, TOTPDevice,
                                            PhoneDevice)

############################## django_otp ##############################
DEVICE_ID_SESSION_KEY = 'otp_device_id'

def login(request, device):
    """
    Persist the given OTP device in the current session. The device will be
    rejected if it does not belong to ``request.user``.

    This is called automatically any time :func:`seahub.auth.login` is
    called with a user having an ``otp_device`` atribute. If you use Django's
    :func:`~seahub.auth.views.login` view with the django-otp
    authentication forms, then you won't need to call this.

    :param request: The HTTP request
    :type request: :class:`~django.http.HttpRequest`

    :param device: The OTP device used to verify the user.
    :type device: :class:`~seahub.django_otp.models.Device`
    """
    user = getattr(request, 'user', None)

    if (user is not None) and (device is not None) and (device.user == user.email):
        request.session[DEVICE_ID_SESSION_KEY] = device.persistent_id
        request.user.otp_device = device


def _handle_auth_login(sender, request, user, **kwargs):
    """
    Automatically persists an OTP device that was set by an OTP-aware
    AuthenticationForm.
    """
    if hasattr(user, 'otp_device'):
        login(request, user.otp_device)

user_logged_in.connect(_handle_auth_login)

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

def devices_for_user(user):
    """
    Return an iterable of all devices registered to the given user.

    Returns an empty iterable for anonymous users.

    :param user: standard or custom user object.
    :type user: :class:`~seahub.auth.models.User`

    :rtype: iterable
    """
    if user.is_anonymous():
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

def import_class(path):
    """
    Imports a class based on a full Python path ('pkg.pkg.mod.Class'). This
    does not trap any exceptions if the path is not valid.
    """
    module, name = path.rsplit('.', 1)
    __import__(module)
    mod = sys.modules[module]
    cls = getattr(mod, name)

    return cls
