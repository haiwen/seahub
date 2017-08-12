import json
from django.core.urlresolvers import reverse
from seahub.test_utils import BaseTestCase
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email

class AccountTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.url = reverse('api-v2.1-user')

    def tearDown(self):
        pass

    def test_get_info(self):

        self.login_as(self.user)

        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert json_resp['email'] == self.user_name
        assert json_resp['name'] == email2nickname(self.user_name)
        assert json_resp['contact_email'] == email2contact_email(self.user_name)
        assert json_resp.has_key('list_in_address_book')

    def test_update_list_in_address_book(self):

        self.login_as(self.user)

        data = {"list_in_address_book": "true"}
        resp = self.client.put(self.url, json.dumps(data), 'application/json')
        json_resp = json.loads(resp.content)
        assert json_resp['list_in_address_book'] is True

        data = {"list_in_address_book": "false"}
        resp = self.client.put(self.url, json.dumps(data), 'application/json')
        json_resp = json.loads(resp.content)
        assert json_resp['list_in_address_book'] is False
