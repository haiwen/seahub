# Copyright (c) 2012-2016 Seafile Ltd.
from django.urls import path

from .views import *

urlpatterns = [
    path('link/save/', save_shared_link, name='save_shared_link'),
    path('link/export-excel/', export_shared_link, name='export_shared_link'),
    path('ajax/private-share-dir/', ajax_private_share_dir, name='ajax_private_share_dir'),
    path('ajax/get-link-email-audit-code/', ajax_get_link_email_audit_code, name='ajax_get_link_email_audit_code'),
]
