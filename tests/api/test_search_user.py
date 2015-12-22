import json

from django.core.urlresolvers import reverse

from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase


class SearchUserTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('search-user')

    def test_can_search(self):
        p = Profile.objects.add_or_update(self.user.email, nickname="test")
        p.contact_email = 'new_mail@test.com'
        p.save()

        resp = self.client.get(self.endpoint + '?q=' + self.user.email)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == self.user.email
        assert json_resp['users'][0]['avatar'] is not None
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == 'test'
        assert json_resp['users'][0]['contact_email'] == 'new_mail@test.com'

    def test_can_search_by_nickname(self):
        p = Profile.objects.add_or_update(self.user.email, nickname="Test")
        p.contact_email = 'new_mail@test.com'
        p.save()

        resp = self.client.get(self.endpoint + '?q=' + "Test")
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == self.user.email
        assert json_resp['users'][0]['avatar'] is not None
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == 'Test'
        assert json_resp['users'][0]['contact_email'] == 'new_mail@test.com'

    def test_can_search_by_nickname_insensitive(self):
        p = Profile.objects.add_or_update(self.user.email, nickname="Test")
        p.contact_email = 'new_mail@test.com'
        p.save()

        resp = self.client.get(self.endpoint + '?q=' + "test")
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == self.user.email
        assert json_resp['users'][0]['avatar'] is not None
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == 'Test'
        assert json_resp['users'][0]['contact_email'] == 'new_mail@test.com'
