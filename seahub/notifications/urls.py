# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url
from .views import *

urlpatterns = [
    ########## user notifications
    url(r'^list/$', user_notification_list, name='user_notification_list'),
    url(r'^more/$', user_notification_more, name='user_notification_more'),
    url(r'^remove/$', user_notification_remove, name='user_notification_remove'),
]
