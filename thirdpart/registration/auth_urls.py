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
from django.conf.urls import patterns, url

from seahub.auth import views as auth_views
from seahub.two_factor.views.login import TwoFactorVerifyView

urlpatterns = patterns('',
                       url(r'^password/change/$',
                           auth_views.password_change,
                           name='auth_password_change'),
                       url(r'^password/change/done/$',
                           auth_views.password_change_done,
                           name='auth_password_change_done'),
                       url(r'^password/reset/$',
                           auth_views.password_reset,
                           name='auth_password_reset'),
                       url(r'^password/reset/confirm/(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$',
                           auth_views.password_reset_confirm,
                           name='auth_password_reset_confirm'),
                       url(r'^password/reset/complete/$',
                           auth_views.password_reset_complete,
                           name='auth_password_reset_complete'),
                       url(r'^password/reset/done/$',
                           auth_views.password_reset_done,
                           name='auth_password_reset_done'),

                       url(r'^login/two-factor-auth/$',
                           TwoFactorVerifyView.as_view(),
                           name='two_factor_auth'),
)

if getattr(settings, 'ENABLE_LOGIN_SIMPLE_CHECK', False):
    urlpatterns += patterns('',
                            (r'^login/simple_check/$',
                             auth_views.login_simple_check),
                            )

if getattr(settings, 'ENABLE_SSO', False):
    urlpatterns += patterns('',
                            url(r'^login/$', 'django_cas.views.login'),
                            url(r'^logout/$', 'django_cas.views.logout'),
                            )
else:
    urlpatterns += patterns('',
                            url(r'^login/$',
                                auth_views.login,
                                {'template_name': 'registration/login.html',
                                 'redirect_if_logged_in': 'libraries'},
                                name='auth_login'),
                            url(r'^logout/$',
                                auth_views.logout,
                                {'template_name': 'registration/logout.html',
                                 'next_page': settings.LOGOUT_REDIRECT_URL},
                                name='auth_logout'),
                            )
