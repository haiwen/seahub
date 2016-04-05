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
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == 'Carl Smith'
        assert json_resp['users'][0]['contact_email'] == 'new_mail@test.com'

    def test_can_search_by_nickname_insensitive(self):
        admin_email = self.admin.email

        p = Profile.objects.add_or_update(admin_email, nickname="Carl Smith")
        p.contact_email = 'new_mail@test.com'
        p.save()

        refresh_cache(admin_email)

        # test lower case
        resp = self.client.get(self.endpoint + '?q=' + "carl")
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == admin_email
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == 'Carl Smith'
        assert json_resp['users'][0]['contact_email'] == 'new_mail@test.com'

        # test upper case
        resp = self.client.get(self.endpoint + '?q=' + "CARL")
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == admin_email
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == 'Carl Smith'
        assert json_resp['users'][0]['contact_email'] == 'new_mail@test.com'

    def test_can_search_by_contact_email(self):
        admin_email = self.admin.email
        nickname = 'admin_test'

        p = Profile.objects.add_or_update(admin_email, nickname=nickname)
        p.contact_email = 'new_mail@test.com'
        p.save()

        refresh_cache(self.user.email)

        resp = self.client.get(self.endpoint + '?q=' + 'new_mail')
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == admin_email
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == nickname
        assert json_resp['users'][0]['contact_email'] == 'new_mail@test.com'

