# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .views import *


urlpatterns = [
    path('', contact_list, name='contacts'),
    path('list/', contact_list, name='contact_list'),
    path('add/', contact_add, name='contact_add'),
    path('edit/', contact_edit, name='contact_edit'),
    path('delete/', contact_delete, name='contact_delete'),
]
