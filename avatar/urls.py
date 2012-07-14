from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('avatar.views',
    url('^add/$', 'add', name='avatar_add'),
    url('^group/add/$', 'group_add', name='avatar_group_add'),
#    url('^change/$', 'change', name='avatar_change'),
#    url('^delete/$', 'delete', name='avatar_delete'),
    url('^render_primary/(?P<user>[^/]+)/(?P<size>[\d]+)/$', 'render_primary', name='avatar_render_primary'),    
)
