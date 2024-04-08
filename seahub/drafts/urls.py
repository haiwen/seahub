# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .views import draft, drafts

urlpatterns = [
    path('', drafts, name='drafts'),
    path('<int:pk>/', draft, name='draft'),
]
