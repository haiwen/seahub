# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url

from views import *

urlpatterns = [
    url(r'^link/send/$', send_shared_link, name='send_shared_link'),
    url(r'^link/save/$', save_shared_link, name='save_shared_link'),
    url(r'^upload_link/send/$', send_shared_upload_link, name='send_shared_upload_link'),
    url(r'^ajax/private-share-dir/$', ajax_private_share_dir, name='ajax_private_share_dir'),
    url(r'^ajax/get-link-audit-code/$', ajax_get_link_audit_code, name='ajax_get_link_audit_code'),
]
