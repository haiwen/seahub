from django.http import HttpResponseRedirect
from django.utils.translation import gettext as _
from django.conf import settings as django_settings

from seahub.utils import render_error
from seahub.settings import SITE_ROOT
from seahub.api2.models import Token, TokenV2
from seahub.auth import REDIRECT_FIELD_NAME, login
from seahub.base.accounts import User, AuthBackend


def mobile_login(request):

    """
    Login user via seahub web api auth token
    """

    auth = request.headers.get('authorization', '').split()
    if not auth or auth[0].lower() != 'token':
        return render_error(request, 'token invalid')

    key = auth[1]
    try:
        token = Token.objects.get(key=key)
    except Token.DoesNotExist:
        try:
            token = TokenV2.objects.get(key=key)
        except TokenV2.DoesNotExist:
            return render_error(request, 'token invalid')

    try:
        user = User.objects.get(email=token.user)
    except User.DoesNotExist:
        error_msg = _(f'User {token.user} not found')
        return render_error(request, error_msg)

    if not user.is_active:
        error_msg = _(f'User {token.user} inactive')
        return render_error(request, error_msg)

    user.backend = AuthBackend.__module__ + ".AuthBackend"
    login(request, user)

    redirect_to = request.GET.get(REDIRECT_FIELD_NAME, SITE_ROOT)
    response = HttpResponseRedirect(redirect_to)
    response['Session-Cookie-Name'] = django_settings.SESSION_COOKIE_NAME
    return response
