# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path
from .views import *

urlpatterns = [
    ########## user notifications
    path('list/', user_notification_list, name='user_notification_list'),
]
