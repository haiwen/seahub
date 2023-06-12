# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .views import group_remove

urlpatterns = [
    path('<int:group_id>/remove/', group_remove, name='group_remove'),
]
