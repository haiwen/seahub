import json
from mock import patch

from django.urls import reverse
from django.test import override_settings

from seahub.contacts.models import Contact
from seahub.profile.models import Profile
from seahub.profile.utils import refresh_cache
from seahub.api2.endpoints.search_user import SearchUser
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

class SearchUserTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('search-user')

    @override_settings(CLOUD_MODE = False)
    @override_settings(ENABLE_ADDRESSBOOK_OPT_IN = False)
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

    @override_settings(ENABLE_ADDRESSBOOK_OPT_IN = True)
    def test_search_when_enable_addressbook_opt_in(self):
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
        assert len(json_resp['users']) == 0

        p.list_in_address_book = True
        p.save()

        resp = self.client.get(self.endpoint + '?q=' + email)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'] is not None
        assert json_resp['users'][0]['email'] == email
        assert json_resp['users'][0]['avatar_url'] is not None
        assert json_resp['users'][0]['name'] == nickname
        assert json_resp['users'][0]['contact_email'] == contact_email

    @override_settings(CLOUD_MODE = False)
    @override_settings(ENABLE_ADDRESSBOOK_OPT_IN = False)
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

    @override_settings(CLOUD_MODE = False)
    @override_settings(ENABLE_ADDRESSBOOK_OPT_IN = False)
    def test_search_without_myself(self):
        email = self.user.email
        resp = self.client.get(self.endpoint + '?include_self=0&q=' + email)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert len(json_resp['users']) == 0

    @override_settings(CLOUD_MODE = False)
    @override_settings(ENABLE_ADDRESSBOOK_OPT_IN = False)
    def test_search_unregistered_user(self):
        resp = self.client.get(self.endpoint + '?q=unregistered_user@seafile.com')
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert len(json_resp['users']) == 0

    @override_settings(CLOUD_MODE = False)
    @override_settings(ENABLE_ADDRESSBOOK_OPT_IN = False)
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

    @override_settings(CLOUD_MODE = False)
    @override_settings(ENABLE_ADDRESSBOOK_OPT_IN = False)
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

    @override_settings(CLOUD_MODE = False)
    @override_settings(ENABLE_ADDRESSBOOK_OPT_IN = False)
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

    @override_settings(CLOUD_MODE = True)
    @override_settings(ENABLE_GLOBAL_ADDRESSBOOK = False)
    @override_settings(ENABLE_ADDRESSBOOK_OPT_IN = False)
    @patch('seahub.api2.endpoints.search_user.is_org_context')
    def test_search_full_email(self, mock_is_org_context):

        mock_is_org_context.return_value = False

        resp = self.client.get(self.endpoint + '?q=%s' % self.admin.username)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['users'][0]['email'] == self.admin.username

    @patch.object(SearchUser, '_can_use_global_address_book')
    @override_settings(ENABLE_ADDRESSBOOK_OPT_IN = False)
    def test_search_when_not_use_global_address_book(self, mock_can_use_global_address_book):

        mock_can_use_global_address_book.return_value = False

        contact_email = '%s@%s.com' % (randstring(6), randstring(6))

        p = Profile.objects.add_or_update(self.admin.username, nickname='')
        p.contact_email = contact_email
        p.save()

        # search with valid email
        resp = self.client.get(self.endpoint + '?q=%s' % contact_email)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['users'][0]['email'] == self.admin.username

        # search with invalid email & has no contacts
        resp = self.client.get(self.endpoint + '?q=%s' % contact_email[:6])
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert len(json_resp['users']) == 0

        # search with invalid email & has contact
        nickname_of_admin = randstring(6)
        Contact.objects.add_contact(self.user.username, self.admin.username)
        Profile.objects.add_or_update(self.admin.username, nickname=nickname_of_admin)
        resp = self.client.get(self.endpoint + '?q=%s' % nickname_of_admin)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['users'][0]['email'] == self.admin.username
