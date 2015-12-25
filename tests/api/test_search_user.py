import json

from django.core.urlresolvers import reverse

from seahub.profile.models import Profile
from seahub.profile.utils import refresh_cache
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
        admin_email = self.admin.email

        p = Profile.objects.add_or_update(admin_email, nickname="Carl Smith")
        p.contact_email = 'new_mail@test.com'
        p.save()

        refresh_cache(self.user.email)

        resp = self.client.get(self.endpoint + '?q=' + "Carl")
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == admin_email
        assert json_resp['users'][0]['avatar'] is not None
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == 'Carl Smith'
        assert json_resp['users'][0]['contact_email'] == 'new_mail@test.com'

    def test_can_search_by_nickname_insensitive(self):
        admin_email = self.admin.email

        p = Profile.objects.add_or_update(admin_email, nickname="Carl Smith")
        p.contact_email = 'new_mail@test.com'
        p.save()

        refresh_cache(admin_email)

        resp = self.client.get(self.endpoint + '?q=' + "Carl")
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == admin_email
        assert json_resp['users'][0]['avatar'] is not None
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == 'Carl Smith'
        assert json_resp['users'][0]['contact_email'] == 'new_mail@test.com'
