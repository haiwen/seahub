from django.conf.urls.defaults import *

from views import group_list, group_add, group_info, \
    group_add_member, group_remove_member, \
    group_quit, group_remove, group_manage

urlpatterns = patterns('',
    url(r'^$', group_list, name='group_list'),
    (r'^add/$', group_add),
    (r'^rm/$', group_remove),
    (r'^memberadd/$', group_add_member),
    (r'^memberrm/$', group_remove_member),
    (r'^quit/$', group_quit),
    url(r'^manage/(?P<group_id>[^/]+)/$', group_manage, name='group_manage'),
    url(r'^(?P<group_id>[^/]+)/$', group_info, name='group_info'),
)
