# Copyright (c) 2012-2016 Seafile Ltd.

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
