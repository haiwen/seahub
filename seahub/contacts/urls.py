# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from views import *


urlpatterns = [
    url(r'^$', contact_list, name='contacts'),
    url(r'^list/$', contact_list, name='contact_list'),
    url(r'^add/$', contact_add, name='contact_add'),
    url(r'^edit/$', contact_edit, name='contact_edit'),
    url(r'^delete/$', contact_delete, name='contact_delete'),
]
