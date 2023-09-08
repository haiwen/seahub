import json

from django.test import TransactionTestCase
from django.urls import path, re_path

from seahub.base.models import ClientSSOToken
from seahub.test_utils import Fixtures
from seahub.api2.urls import urlpatterns as api2_urls
from seahub.api2.endpoints.sso.client_sso_link import ClientSSOLink
from seahub.urls import urlpatterns
from seahub.views.sso import client_sso

urlpatterns += [
    re_path(r'^client-sso/(?P<uuid>[^/]+)/$', client_sso, name="client_sso"),
]

api2_urls += [
    path('client-sso-link/', ClientSSOLink.as_view()),
    re_path(r'^client-sso-link/(?P<uuid>[^/]+)/$', ClientSSOLink.as_view()),
]


class ClientSSOLinkTest(TransactionTestCase, Fixtures):

    def test_create(self):
        resp = self.client.post('/api2/client-sso-link/')
        self.assertEqual(resp.status_code, 200)

        json_resp = json.loads(resp.content)
        assert json_resp['link'] is not None

    def test_query_status(self):
        t = ClientSSOToken.objects.new()
        url = '/api2/client-sso-link/%s/' % t.token

        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        json_resp = json.loads(resp.content)
        assert json_resp['status'] == 'waiting'

        t.accessed()
        t.completed(email=self.user.username, api_key='xxx')

        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        assert json_resp['status'] == 'success'
        assert json_resp['email'] == self.user.username
        assert json_resp['apiToken'] == 'xxx'
