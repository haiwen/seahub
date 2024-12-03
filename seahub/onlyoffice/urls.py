# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from seahub.onlyoffice.views import onlyoffice_editor_callback, OfficeSuiteConfig

urlpatterns = [
    path('editor-callback/', onlyoffice_editor_callback, name='onlyoffice_editor_callback'),
    path('office-suite/', OfficeSuiteConfig.as_view(), name='onlyoffice_office_suite'),
]
