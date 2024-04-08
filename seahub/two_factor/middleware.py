# Copyright (c) 2012-2016 Seafile Ltd.

import re

from django.utils.deprecation import MiddlewareMixin
from constance import config
from django.urls import reverse
from django.http import HttpResponseRedirect

from . import DEVICE_ID_SESSION_KEY
from .models import Device
from seahub.options.models import UserOptions
from seahub.settings import SITE_ROOT, ENABLE_FORCE_2FA_TO_ALL_USERS


class IsVerified(object):
    """ A pickle-friendly lambda. """
    def __init__(self, user):
        self.user = user

    def __call__(self):
        return (self.user.otp_device is not None)


class OTPMiddleware(MiddlewareMixin):
    """
    This must be installed after
    :class:`~django.contrib.auth.middleware.AuthenticationMiddleware` and
    performs an analagous function. Just as AuthenticationMiddleware populates
    ``request.user`` based on session data, OTPMiddleware populates
    ``request.user.otp_device`` to the :class:`~seahub.django_otp.models.Device`
    object that has verified the user, or ``None`` if the user has not been
    verified.  As a convenience, this also installs ``user.is_verified()``,
    which returns ``True`` if ``user.otp_device`` is not ``None``.
    """
    def process_request(self, request):
        if not config.ENABLE_TWO_FACTOR_AUTH:
            return None

        user = getattr(request, 'user', None)

        if user is None:
            return None

        user.otp_device = None
        user.is_verified = IsVerified(user)

        if user.is_anonymous:
            return None

        device_id = request.session.get(DEVICE_ID_SESSION_KEY)
        device = Device.from_persistent_id(device_id) if device_id else None

        if (device is not None) and (device.user != user.email):
            device = None

        if (device is None) and (DEVICE_ID_SESSION_KEY in request.session):
            del request.session[DEVICE_ID_SESSION_KEY]

        user.otp_device = device

        return None


class ForceTwoFactorAuthMiddleware(MiddlewareMixin):
    def filter_request(self, request):
        path = request.path
        black_list = (r'^%s$' % SITE_ROOT, r'sys/.+', r'repo/.+', r'lib/', )

        for patt in black_list:
            if re.search(patt, path) is not None:
                return True
        return False

    def process_request(self, request):
        if not config.ENABLE_TWO_FACTOR_AUTH:
            return None

        user = getattr(request, 'user', None)
        if user is None:
            return None

        if user.is_anonymous:
            return None

        if not self.filter_request(request):
            return None

        if user.otp_device is not None:
            return None

        if (ENABLE_FORCE_2FA_TO_ALL_USERS or UserOptions.objects.is_force_2fa(user.username)) \
                and not request.session.get('is_sso_user'):
            return HttpResponseRedirect(reverse('two_factor:setup'))

        return None
