# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .views import slug, edit_slug
from ..views import react_fake_view

urlpatterns = [
    path('', react_fake_view, name='list'),
    path('<str:slug>/', slug, name='slug'),
    path('edit/<str:slug>/', edit_slug, name='edit_slug'),
    path('<str:slug>/<path:file_path>', slug, name='slug'),
]
