from django.conf.urls.defaults import *

urlpatterns = patterns('profile.views',
    url(r'^$', 'list_userids', name="list_userids"),
#    url(r'^ccnet/$', 'get_ccnet_profile'),
#    url(r'^edit/ccnet/$', 'set_ccnet_profile', name="ccnet_profile_setting"),
#    url(r'^download/$', 'download_profile', name="profile_download"),
)
