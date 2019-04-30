import json
import random
import string

from django.core.urlresolvers import reverse
from seahub.test_utils import BaseTestCase
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.profile.models import Profile, DetailedProfile
from seahub.base.accounts import UserManager


class AccountTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.url = reverse('api-v2.1-user')

    def tearDown(self):
        pass

    def test_get_info(self):

        self.login_as(self.user)

        profile = Profile.objects.get_profile_by_user(self.user_name)
        d_profile = DetailedProfile.objects.get_detailed_profile_by_user(self.user_name)

        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert json_resp['email'] == self.user_name
        assert json_resp['name'] == email2nickname(self.user_name)
        assert json_resp['contact_email'] == email2contact_email(self.user_name)
        if d_profile:
            assert json_resp['telephone'] == d_profile.telephone
        else:
            assert json_resp['telephone'] == ''
        if profile:
            assert json_resp['login_id'] == profile.login_id
        else:
            assert json_resp['login_id'] == ''
        assert json_resp.has_key('list_in_address_book')

    def test_update_user_nickname(self):

        self.login_as(self.user)

        # test can successfully change nickname
        random_nickname_length = random.randint(1,64)
        random_nickname = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(random_nickname_length))
        data = 'name=%s' % random_nickname
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        assert json_resp['name'] == random_nickname

        # nickname too long
        random_nickname_length = random.randint(65,1024)
        random_nickname = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(random_nickname_length))
        data = 'name=%s' % random_nickname
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

        # invalid nickname with '/'
        random_nickname_length = random.randint(1,64)
        random_nickname = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(random_nickname_length))
        random_nickname = random_nickname.replace(random_nickname[random.randint(0, random_nickname_length) - 1], '/')
        data = 'name=%s' % random_nickname
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)


    def test_update_user_telephone(self):

        self.login_as(self.user)

        # test can successfully change telephone
        random_telephone_length = random.randint(1,100)
        random_telephone = ''.join(random.choice(string.digits) for _ in range(random_telephone_length))
        data = 'telephone=%s' % random_telephone
        Profile.objects.add_or_update(self.user_name)
        DetailedProfile.objects.add_or_update(self.user_name, department='' ,telephone='')
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        assert json_resp['telephone'] == random_telephone

        # telephone too long
        random_telephone_length = random.randint(100,500)
        random_telephone = ''.join(random.choice(string.digits) for _ in range(random_telephone_length))
        data = 'telephone=%s' % random_telephone
        Profile.objects.add_or_update(self.user_name)
        DetailedProfile.objects.add_or_update(self.user_name, department='' ,telephone='')
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

    def test_update_user_login_id(self):

        self.login_as(self.user)

        # test can successfully change login id
        random_loginid_length = random.randint(1,225)
        random_loginid = ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_loginid_length))
        data = 'login_id=%s' % random_loginid
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        assert json_resp['login_id'] == random_loginid

        # login id too long
        random_loginid_length = random.randint(226,500)
        random_loginid = ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_loginid_length))
        data = 'login_id=%s' % random_loginid
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

        # same login id already exists
        new_user1 = UserManager().create_user(email='1@1.com', password='1')
        random_loginid_length = random.randint(1,225)
        random_same_login_id = ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_loginid_length))
        Profile.objects.add_or_update(new_user1.username, login_id=random_same_login_id)
        data = 'login_id=%s' % random_same_login_id
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)
        new_user1.delete()

    def test_update_user_contact_email(self):

        self.login_as(self.user)

        # test can successfully change contact email
        random_pre_length = random.randint(1,50)
        random_post_length = random.randint(1,20)
        random_contact_email = ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_pre_length))\
            + '@' \
            + ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_pre_length))\
            + '.com'
        data = 'contact_email=%s' % random_contact_email
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        assert json_resp['contact_email'] == random_contact_email

        # test invalid contact email
        random_contact_email_length = random.randint(1,100)
        random_contact_email = ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_pre_length))
        data = 'contact_email=%s' % random_contact_email
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

        # same contact email already exists
        random_pre_length = random.randint(1,50)
        random_post_length = random.randint(1,20)
        random_contact_email = ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_pre_length))\
            + '@' \
            + ''.join(random.choice(string.digits + string.ascii_letters) for _ in range(random_pre_length))\
            + '.com'

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
