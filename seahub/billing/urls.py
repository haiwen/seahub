from django.urls import path, re_path

from . import apis, views

urlpatterns = [
    path('', views.billing, name='billing'),
    re_path(r'^api/organizations/(?P<org_id>\d+)/ai-credit/$',
            apis.BillingOrganizationAICredit.as_view(),
            name='billing-api-organization-ai-credit'),
]
