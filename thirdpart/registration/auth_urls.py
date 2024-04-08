"""
URL patterns for the views included in ``django.contrib.auth``.

Including these URLs (via the ``include()`` directive) will set up the
following patterns based at whatever URL prefix they are included
under:

* User login at ``login/``.

* User logout at ``logout/``.

* The two-step password change at ``password/change/`` and
  ``password/change/done/``.

* The four-step password reset at ``password/reset/``,
  ``password/reset/confirm/``, ``password/reset/complete/`` and
  ``password/reset/done/``.

The default registration backend already has an ``include()`` for
these URLs, so under the default setup it is not necessary to manually
include these views. Other backends may or may not include them;
consult a specific backend's documentation for details.

"""

from django.conf import settings
from django.urls import path, re_path

from seahub.auth import views as auth_views
from seahub.two_factor.views.login import TwoFactorVerifyView

urlpatterns = [
    path('password/change/',
        auth_views.password_change,
        name='auth_password_change'),
    path('password/change/done/',
        auth_views.password_change_done,
        name='auth_password_change_done'),
    path('password/reset/',
        auth_views.password_reset,
        name='auth_password_reset'),
    re_path(r'^password/reset/confirm/(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$',
        auth_views.password_reset_confirm,
        name='auth_password_reset_confirm'),
    path('password/reset/complete/',
        auth_views.password_reset_complete,
        name='auth_password_reset_complete'),
    path('password/reset/done/',
        auth_views.password_reset_done,
        name='auth_password_reset_done'),

    path('login/two-factor-auth/',
        TwoFactorVerifyView.as_view(),
        name='two_factor_auth'),
]

if getattr(settings, 'ENABLE_LOGIN_SIMPLE_CHECK', False):
    urlpatterns += [
        path('login/simple_check/',
            auth_views.login_simple_check),
    ]


urlpatterns += [
    path('login/',
        auth_views.login,
        {'template_name': 'registration/login.html',
         'redirect_if_logged_in': 'libraries'},
        name='auth_login'),
    path('logout/',
        auth_views.logout,
        {'template_name': 'registration/logout.html',
         'next_page': settings.LOGOUT_REDIRECT_URL},
        name='auth_logout'),
]
