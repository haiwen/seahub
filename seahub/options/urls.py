# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .views import *

urlpatterns = [
    path('save/', save_options, name='options_save'),
    path('enable_sub_lib/', sub_lib_enable_set, name='sub_lib_enable_set'),
]
