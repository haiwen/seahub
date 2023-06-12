"""
URLconf for registration and activation, using django-registration's
default backend.

If the default behavior of these views is acceptable to you, simply
use a line like this in your root URLconf to set up the default URLs
for registration::

    (r'^accounts/', include('registration.backends.default.urls')),

This will also automatically set up the views in
``django.contrib.auth`` at sensible default locations.

If you'd like to customize the behavior (e.g., by passing extra
arguments to the various views) or split up the URLs, feel free to set
up your own URL patterns for these views instead.

"""


from django.urls import include, path, re_path
from django.views.generic import TemplateView

from registration.views import activate
from registration.views import register


urlpatterns = [
    path('activate/complete/',
        TemplateView.as_view(template_name='registration/activation_complete.html'),
        name='registration_activation_complete'),
    # Activation keys get matched by \w+ instead of the more specific
    # [a-fA-F0-9]{40} because a bad activation key should still get to the view;
    # that way it can return a sensible "invalid key" message instead of a
    # confusing 404.
    re_path(r'^activate/(?P<activation_key>\w+)/$',
        activate,
        { 'backend': 'registration.backends.default.DefaultBackend' },
        name='registration_activate'),
    path('register/',
        register,
        { 'backend': 'registration.backends.default.DefaultBackend' },
        name='registration_register'),
    path('register/complete/',
        TemplateView.as_view(template_name='registration/registration_complete.html'),
        name='registration_complete'),
    path('register/closed/',
        TemplateView.as_view(template_name='registration/registration_closed.html'),
        name='registration_disallowed'),
    path('', include('registration.auth_urls')),
]
