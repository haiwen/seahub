from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('seahub.notifications.views',
#    url(r'^$', 'notification_list', name='notification_list'),
    url(r'^add/$', 'notification_add', name='notification_add'),
    url(r'^delete/(?P<nid>[\d]+)/$', 'notification_delete', name='notification_delete'),
    url(r'^set-primary/(?P<nid>[\d]+)/$', 'set_primary', name='set_primary'),
)


