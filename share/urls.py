from django.conf.urls.defaults import *

from views import *

urlpatterns = patterns('',
    url(r'^add/$', share_repo, name='share_repo'),
    url('^remove/(?P<token>[^/]{24,24})/$', remove_anonymous_share, name='remove_anonymous_share'),
    url('^(?P<token>[^/]{24,24})/$', anonymous_share_confirm, name='anonymous_share_confirm'),
)
