# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from views import *

urlpatterns = [
    url(r'^save/$', save_options, name='options_save'),
    url(r'^enable_sub_lib/$', sub_lib_enable_set, name='sub_lib_enable_set'),
]
