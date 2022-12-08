# -*- coding: utf-8 -*-
from django.conf.urls import url, include

from seahub.adfs_auth.views import assertion_consumer_service, auth_complete, org_multi_adfs

urlpatterns = [
    url(r'^$', org_multi_adfs, name="org_multi_adfs"),
    url(r'^saml2/acs/$', assertion_consumer_service, name='org_saml2_acs'),
    url(r'^saml2/complete/$', auth_complete, name='org_saml2_complete'),
    url(r'^saml2/', include('djangosaml2.urls')),
]
