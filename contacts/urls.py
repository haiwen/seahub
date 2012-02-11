from django.conf.urls.defaults import *

from views import *


urlpatterns = patterns('',
    url(r'^$', contact_list),
    url(r'^list/$', contact_list, name='contact_list'),
    url(r'^add/$',  contact_add, name='contact_add'),
    url(r'^delete/$', contact_delete, name='contact_delete'),
)
