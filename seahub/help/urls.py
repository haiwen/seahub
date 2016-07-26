# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf.urls import patterns, url, include
from django.views.generic import TemplateView

urlpatterns = patterns('',
    (r'^$', TemplateView.as_view(template_name="help/install.html") ),
    (r'^install/$', TemplateView.as_view(template_name="help/install.html") ),
    (r'^sync_existing/$', TemplateView.as_view(template_name="help/sync_existing.html") ),
    (r'^selective_sync/$', TemplateView.as_view(template_name="help/selective_sync.html") ),
    (r'^unsync_resync/$', TemplateView.as_view(template_name="help/unsync_resync.html") ),
    (r'^sync_interval/$', TemplateView.as_view(template_name="help/sync_interval.html") ),
    (r'^desktop_proxy/$', TemplateView.as_view(template_name="help/desktop_proxy.html") ),
    (r'^conflicts/$', TemplateView.as_view(template_name="help/conflicts.html") ),
    (r'^ignore/$', TemplateView.as_view(template_name="help/ignore.html") ),
    (r'^encrypted_libraries/$', TemplateView.as_view(template_name="help/encrypted_libraries.html") ),
)
