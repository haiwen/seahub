

from django.conf import settings
from django.contrib import auth
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpResponse
from django.shortcuts import redirect
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView

from urllib.parse import quote

#Logout settings.
from shibboleth.app_settings import LOGOUT_URL, LOGOUT_REDIRECT_URL, LOGOUT_SESSION_KEY

class ShibbolethView(TemplateView):
    """
    This is here to offer a Shib protected page that we can
    route users through to login.
    """
    template_name = 'shibboleth/user_info.html'
    
    @method_decorator(login_required)
    def dispatch(self, request, *args, **kwargs):
        """
        Django docs say to decorate the dispatch method for 
        class based views.
        https://docs.djangoproject.com/en/dev/topics/auth/
        """
        return super(ShibbolethView, self).dispatch(request, *args, **kwargs)
    
    def get(self, request, **kwargs):
        """Process the request."""
        next_page = self.request.GET.get('next', None)
        if next_page is not None:
            return redirect(next_page)
        return super(ShibbolethView, self).get(request)
    
    def get_context_data(self, **kwargs):
        context = super(ShibbolethView, self).get_context_data(**kwargs)
        context['user'] = self.request.user
        return context

class ShibbolethLoginView(TemplateView):
    """
    Pass the user to the Shibboleth login page.
    Some code borrowed from:
    https://github.com/stefanfoulis/django-class-based-auth-views.
    """
    redirect_field_name = "target"

    def get(self, *args, **kwargs):
        #Remove session value that is forcing Shibboleth reauthentication.
        self.request.session.pop(LOGOUT_SESSION_KEY, None)
        login = settings.LOGIN_URL + '?target=%s' % quote(self.request.GET.get(self.redirect_field_name))
        return redirect(login)
    
class ShibbolethLogoutView(TemplateView):
    """
    Pass the user to the Shibboleth logout page.
    Some code borrowed from:
    https://github.com/stefanfoulis/django-class-based-auth-views.
    """
    redirect_field_name = "target"

    def get(self, *args, **kwargs):
        #Log the user out.
        auth.logout(self.request)
        #Set session key that middleware will use to force 
        #Shibboleth reauthentication.
        self.request.session[LOGOUT_SESSION_KEY] = True
        #Get target url in order of preference.
        target = LOGOUT_REDIRECT_URL or\
                 quote(self.request.GET.get(self.redirect_field_name)) or\
                 quote(request.build_absolute_uri())
        logout = LOGOUT_URL % target
        return redirect(logout)


