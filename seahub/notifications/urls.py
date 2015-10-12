from django.conf.urls import patterns, url

urlpatterns = patterns('seahub.notifications.views',
#    url(r'^$', 'notification_list', name='notification_list'),
    url(r'^add/$', 'notification_add', name='notification_add'),
    url(r'^delete/(?P<nid>[\d]+)/$', 'notification_delete', name='notification_delete'),
    url(r'^set-primary/(?P<nid>[\d]+)/$', 'set_primary', name='set_primary'),

########## user notifications
    url(r'^list/$', 'user_notification_list', name='user_notification_list'),
    url(r'^more/$', 'user_notification_more', name='user_notification_more'),
    url(r'^remove/$', 'user_notification_remove', name='user_notification_remove'),
)


