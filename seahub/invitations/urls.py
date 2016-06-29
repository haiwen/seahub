from django.conf.urls import patterns, url

from .views import token_view

urlpatterns = patterns(
    '',
    url(r'^token/(?P<token>[a-f0-9]{32})/$', token_view, name='token_view')
)
