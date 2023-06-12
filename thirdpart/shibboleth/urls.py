from distutils.version import StrictVersion
import django
if StrictVersion(django.get_version()) < StrictVersion('1.4'):
    from django.conf.urls.defaults import *
else:
    from django.urls import path

from .views import ShibbolethView, ShibbolethLogoutView, ShibbolethLoginView

urlpatterns = [
    path('login/', ShibbolethLoginView.as_view(), name='login'),
    path('logout/', ShibbolethLogoutView.as_view(), name='logout'),
    path('', ShibbolethView.as_view(), name='info'),
]
