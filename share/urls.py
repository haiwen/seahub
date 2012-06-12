from django.conf.urls.defaults import *

from views import *

urlpatterns = patterns('',
    url(r'^add/$', share_repo),
    url('^remove/(?P<token>.+)/$', remove_anonymous_share, name='remove_anonymous_share'),
    url('^(?P<token>.+)/$', anonymous_share_confirm, name='anonymous_share_confirm'),
)
