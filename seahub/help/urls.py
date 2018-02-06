# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import url, include
from django.views.generic import TemplateView

urlpatterns = [
    url(r'^$', TemplateView.as_view(template_name="help/install.html") ),
    url(r'^install/$', TemplateView.as_view(template_name="help/install.html") ),
    url(r'^sync_existing/$', TemplateView.as_view(template_name="help/sync_existing.html") ),
    url(r'^selective_sync/$', TemplateView.as_view(template_name="help/selective_sync.html") ),
    url(r'^unsync_resync/$', TemplateView.as_view(template_name="help/unsync_resync.html") ),
    url(r'^sync_interval/$', TemplateView.as_view(template_name="help/sync_interval.html") ),
    url(r'^desktop_proxy/$', TemplateView.as_view(template_name="help/desktop_proxy.html") ),
    url(r'^conflicts/$', TemplateView.as_view(template_name="help/conflicts.html") ),
    url(r'^ignore/$', TemplateView.as_view(template_name="help/ignore.html") ),
    url(r'^encrypted_libraries/$', TemplateView.as_view(template_name="help/encrypted_libraries.html") ),
]
