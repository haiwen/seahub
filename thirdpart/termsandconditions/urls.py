"""
    Master URL Pattern List for the application.  Most of the patterns here should be top-level
    pass-offs to sub-modules, who will have their own urls.py defining actions within.
"""

# pylint: disable=W0401, W0614, E1120

from django.conf.urls import url
from .views import TermsView, AcceptTermsView, EmailTermsView
from .models import DEFAULT_TERMS_SLUG

urlpatterns = (
    # # View Default Terms
    url(r'^$', TermsView.as_view(), {"slug": DEFAULT_TERMS_SLUG}, name="tc_view_page"),

    # # View Specific Active Terms
    # url(r'^view/(?P<slug>[a-zA-Z0-9_.-]+)/$', TermsView.as_view(), name="tc_view_specific_page"),

    # # View Specific Version of Terms
    # url(r'^view/(?P<slug>[a-zA-Z0-9_.-]+)/(?P<version>[0-9.]+)/$', TermsView.as_view(), name="tc_view_specific_version_page"),

    # # Print Specific Version of Terms
    # url(r'^print/(?P<slug>[a-zA-Z0-9_.-]+)/(?P<version>[0-9.]+)/$', TermsView.as_view(template_name="termsandconditions/tc_print_terms.html"), name="tc_print_page"),

    # Accept Terms
    url(r'^accept/$', AcceptTermsView.as_view(), name="tc_accept_page"),

    # Accept Specific Terms
    url(r'^accept/(?P<slug>[a-zA-Z0-9_.-]+)$', AcceptTermsView.as_view(), name="tc_accept_specific_page"),

    # Accept Specific Terms Version
    url(r'^accept/(?P<slug>[a-zA-Z0-9_.-]+)/(?P<version>[0-9\.]+)/$', AcceptTermsView.as_view(), name="tc_accept_specific_version_page"),

    # # Email Terms
    # url(r'^email/$', EmailTermsView.as_view(), name="tc_email_page"),

    # # Email Specific Terms Version
    # url(r'^email/(?P<slug>[a-zA-Z0-9_.-]+)/(?P<version>[0-9\.]+)/$', EmailTermsView.as_view(), name="tc_specific_version_page"),

)
