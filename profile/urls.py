from django.conf.urls.defaults import *

urlpatterns = patterns('profile.views',
    url(r'^$', 'list_userids', name="list_userids"),
    url(r'^logout/$', 'logout_relay', name="logout_relay"),
)
