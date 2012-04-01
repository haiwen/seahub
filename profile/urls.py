from django.conf.urls.defaults import *

urlpatterns = patterns('profile.views',
    url(r'^$', 'show_profile'),
    url(r'^ccnet/$', 'get_ccnet_profile'),
#    url(r'^edit/$', 'set_profile', name="profile_setting"),
    url(r'^edit/ccnet/$', 'set_ccnet_profile', name="ccnet_profile_setting"),
    url(r'^download/$', 'download_profile', name="profile_download"),
)
