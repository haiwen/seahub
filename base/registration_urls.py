from django.conf.urls.defaults import *
from django.views.generic.simple import direct_to_template
from django.conf import settings

from registration.views import activate
from registration.views import register

from seahub.base.accounts import RegistrationForm

reg_dict = { 'backend': 'seahub.base.accounts.RegistrationBackend',
             'form_class': RegistrationForm,
             }

if settings.ACTIVATE_AFTER_REGISTRATION == True:
    reg_dict['success_url'] = settings.SITE_ROOT

urlpatterns = patterns('',
                       url(r'^activate/complete/$',
                           direct_to_template,
                           { 'template': 'registration/activation_complete.html' },
                           name='registration_activation_complete'),
                       # Activation keys get matched by \w+ instead of the more specific
                       # [a-fA-F0-9]{40} because a bad activation key should still get to the view;
                       # that way it can return a sensible "invalid key" message instead of a
                       # confusing 404.
                       url(r'^activate/(?P<activation_key>\w+)/$',
                           activate,
                           { 'backend': 'seahub.base.accounts.RegistrationBackend', },
                           name='registration_activate'),
                       url(r'^register/$',
                           register,
                           reg_dict,
                           name='registration_register'),
                       url(r'^register/complete/$',
                           direct_to_template,
                           { 'template': 'registration/registration_complete.html',
                             'extra_context': { 'send_mail': settings.REGISTRATION_SEND_MAIL } },
                           name='registration_complete'),
                       url(r'^register/closed/$',
                           direct_to_template,
                           { 'template': 'registration/registration_closed.html' },
                           name='registration_disallowed'),
                       (r'', include('registration.auth_urls')),
                       )
