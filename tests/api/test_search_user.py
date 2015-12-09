import json

from django.core.urlresolvers import reverse

from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase

class SearchUserTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('search-user')

    def test_can_search(self):
        email = self.admin.email
        nickname = 'admin_test'
        contact_email= 'new_admin_test@test.com'
        p = Profile.objects.add_or_update(email, nickname=nickname)
        p.contact_email = contact_email
        p.save()

        resp = self.client.get(self.endpoint + '?q=' + email)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == email
        assert json_resp['users'][0]['avatar'] is not None
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == nickname
        assert json_resp['users'][0]['contact_email'] == contact_email

    def test_search_myself(self):
        email = self.user.email
        nickname = 'user_test'
        contact_email= 'new_user_test@test.com'
        p = Profile.objects.add_or_update(email, nickname=nickname)
        p.contact_email = contact_email
        p.save()

        resp = self.client.get(self.endpoint + '?q=' + email)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == email
        assert json_resp['users'][0]['avatar'] is not None
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == nickname
        assert json_resp['users'][0]['contact_email'] == contact_email

    def test_search_without_myself(self):
        email = self.user.email
        resp = self.client.get(self.endpoint + '?include_self=0&q=' + email)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert len(json_resp['users']) == 0

    def test_search_unregistered_user(self):
        resp = self.client.get(self.endpoint + '?q=unregistered_user@seafile.com')
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert len(json_resp['users']) == 0
