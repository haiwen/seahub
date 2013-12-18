from django.conf.urls.defaults import *
# from django.views.generic.simple import direct_to_template
from django.views.generic import TemplateView
from django.conf import settings

from registration.views import activate
from registration.views import register

from seahub.base.accounts import RegistrationForm, DetailedRegistrationForm
from seahub.base.generic import DirectTemplateView

form_class = DetailedRegistrationForm if settings.REQUIRE_DETAIL_ON_REGISTRATION \
    else RegistrationForm
reg_dict = { 'backend': 'seahub.base.accounts.RegistrationBackend',
             'form_class': form_class,
             }

if settings.ACTIVATE_AFTER_REGISTRATION == True:
    reg_dict['success_url'] = settings.SITE_ROOT

urlpatterns = patterns('',
                       url(r'^activate/complete/$',
                           TemplateView.as_view(template_name='registration/activation_complete.html'),
                           name='registration_activation_complete'),
                       # Activation keys get matched by \w+ instead of the more specific
                       # [a-fA-F0-9]{40} because a bad activation key should still get to the view;
                       # that way it can return a sensible "invalid key" message instead of a
                       # confusing 404.
                       url(r'^activate/(?P<activation_key>\w+)/$',
                           activate,
                           { 'backend': 'seahub.base.accounts.RegistrationBackend', },
                           name='registration_activate'),
                       (r'', include('registration.auth_urls')),
                       )

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False
from seahub.settings import ENABLE_SIGNUP

if ENABLE_SIGNUP:
    urlpatterns += patterns('',
        url(r'^register/$',
            register,
            reg_dict,
            name='registration_register'),
        url(r'^register/complete/$',
            DirectTemplateView.as_view(
                template_name='registration/registration_complete.html',
                extra_context={ 'send_mail': settings.REGISTRATION_SEND_MAIL } ),
            name='registration_complete'),
        url(r'^register/closed/$',
            TemplateView.as_view(template_name='registration/registration_closed.html'),
            name='registration_disallowed'),
)

