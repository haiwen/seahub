from django.conf.urls.defaults import *

urlpatterns = patterns('profile.views',
    url(r'^$', 'show_profile'),
    url(r'^edit/$', 'set_profile', name="profile_setting"),
)
