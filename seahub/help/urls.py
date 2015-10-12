from django.conf.urls import patterns, url, include
from django.views.generic import TemplateView

urlpatterns = patterns(
    '',
    (r'^$', TemplateView.as_view(template_name="help/help_install_v2.html") ),
    (r'^install/$', TemplateView.as_view(template_name="help/help_install_v2.html") ),
    (r'^delete/$', TemplateView.as_view(template_name="help/help_delete.html") ),
    (r'^security/$', TemplateView.as_view(template_name="help/help_security.html") ),
    (r'^colab/$', TemplateView.as_view(template_name="help/help_colab.html") ),
    (r'^ignore/$', TemplateView.as_view(template_name="help/help_ignore.html") ),

    (r'^group_share/$', TemplateView.as_view(template_name="help/help_group_share.html") ),
    (r'^view_encrypted/$', TemplateView.as_view(template_name="help/help_view_encrypted.html") ),
)
