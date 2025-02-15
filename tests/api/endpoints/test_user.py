import json
import random
import string
from mock import patch

from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.profile.models import Profile
from seahub.base.accounts import UserManager


def generate_random_parammeter(min_len, max_len, param_type):

    if param_type == 'nickname':
        random_nickname_length = random.randint(min_len, max_len)
        random_nickname = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(random_nickname_length))
        return random_nickname, random_nickname_length

    elif param_type == 'contact_email':
        random_pre_length = random.randint(1, 50)
        random_contact_email = ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_pre_length))\
            + '@' \
            + ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_pre_length))\
            + '.com'
        return random_contact_email

    elif param_type == 'contact_email_invalid':
        random_contact_email_length = random.randint(1, 100)
        random_contact_email = ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_contact_email_length))
        return random_contact_email

    elif param_type == 'login_id':
        random_loginid_length = random.randint(1, 225)
        random_loginid = ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_loginid_length))
        return random_loginid


class AccountTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.url = reverse('api-v2.1-user')

    def tearDown(self):
        pass

    def test_get_info(self):

        self.login_as(self.user)

        random_login_id = generate_random_parammeter(0, 0, 'login_id')

        Profile.objects.add_or_update(
            self.user_name,
            login_id=random_login_id
        )
        profile = Profile.objects.get_profile_by_user(self.user_name)

        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert json_resp['email'] == self.user_name
        assert json_resp['name'] == (profile.nickname if profile.nickname else '')
        assert json_resp['contact_email'] == (profile.contact_email if profile.contact_email else '')
        assert json_resp['login_id'] == profile.login_id
        assert 'list_in_address_book' in json_resp

    def test_update_user_nickname(self):

        self.login_as(self.user)

        # test can successfully change nickname
        random_nickname, _ = generate_random_parammeter(1, 64, 'nickname')
        data = 'name=%s' % random_nickname
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        assert json_resp['name'] == random_nickname

        # nickname too long
        random_nickname, _ = generate_random_parammeter(65, 1024, 'nickname')
        data = 'name=%s' % random_nickname
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

        # invalid nickname with '/'
        random_nickname, random_nickname_length = generate_random_parammeter(1, 64, 'nickname')
        random_nickname = random_nickname.replace(random_nickname[random.randint(0, random_nickname_length) - 1], '/')
        data = 'name=%s' % random_nickname
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

    @patch('seahub.api2.endpoints.user.ENABLE_USER_SET_CONTACT_EMAIL', False)
    def test_update_user_contact_email_feature_disabled(self):
        self.login_as(self.user)
        Profile.objects.add_or_update(self.user_name, contact_email='2@2.com')

        # test can successfully change contact email
        random_contact_email = generate_random_parammeter(0, 0, 'contact_email')
        data = 'contact_email=%s' % random_contact_email
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.user.ENABLE_USER_SET_CONTACT_EMAIL', True)
    def test_update_user_contact_email(self):

        self.login_as(self.user)
        Profile.objects.add_or_update(self.user_name, contact_email='2@2.com')

        # test can successfully change contact email
        random_contact_email = generate_random_parammeter(0, 0, 'contact_email')
        data = 'contact_email=%s' % random_contact_email
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        assert json_resp['contact_email'] == random_contact_email

        # same contact email as his/her own contact email
        contact_email = Profile.objects.get_contact_email_by_user(self.user_name)
        data = 'contact_email=%s' % contact_email
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['contact_email'] == contact_email

        # test invalid contact email
        random_contact_email = generate_random_parammeter(0, 0, 'contact_email_invalid')
        data = 'contact_email=%s' % random_contact_email
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

        # same contact email already exists
        random_contact_email = generate_random_parammeter(0, 0, 'contact_email')
        new_user1 = UserManager().create_user(email='1@1.com', password='1')
        Profile.objects.add_or_update(new_user1.username, contact_email=random_contact_email)
        data = 'contact_email=%s' % random_contact_email
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)
        new_user1.delete()

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
