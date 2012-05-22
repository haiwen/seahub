from django.conf.urls.defaults import *

from views import group_list, group_operations, group_member_operations, \
    group_members

urlpatterns = patterns('',
    url(r'^$', group_list, name='group_list'),
    (r'^(?P<group_id>[\d]+)/$', group_operations),
    url(r'^(?P<group_id>[\d]+)/members/$', group_members, name='group_members'),
    (r'^(?P<group_id>[\d]+)/member/(?P<user_name>[^/]+)/$', group_member_operations),
)
