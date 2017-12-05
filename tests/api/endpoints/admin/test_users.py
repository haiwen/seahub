# -*- coding: utf-8 -*-
import json

from seaserv import ccnet_api, seafile_api
from tests.common.utils import randstring
from django.core.urlresolvers import reverse
from seahub.constants import DEFAULT_USER, GUEST_USER
from seahub.test_utils import BaseTestCase
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.profile.models import DetailedProfile
from seahub.utils.file_size import get_file_size_unit

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class AdminUsersTest(BaseTestCase):

    def setUp(self):
        self.url = reverse('api-v2.1-admin-users')
        self.tmp_email = '%s@email.com' % randstring(10)

    def tearDown(self):
        self.remove_user(self.tmp_email)

    def test_get_users(self):
        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['total_count'] > 0
        assert len(json_resp['data']) == json_resp['total_count']

        assert json_resp['data'][0].has_key('email')
        assert json_resp['data'][0].has_key('name')
        assert json_resp['data'][0].has_key('contact_email')
        assert json_resp['data'][0].has_key('is_staff')
        assert json_resp['data'][0].has_key('is_active')
        assert json_resp['data'][0].has_key('create_time')
        assert json_resp['data'][0].has_key('department')
        assert json_resp['data'][0].has_key('quota_total')
        assert json_resp['data'][0].has_key('quota_usage')
        assert json_resp['data'][0].has_key('create_time')

    def test_get_with_invalid_user_permission(self):
        self.login_as(self.user)

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_create_user(self):
        self.login_as(self.admin)

        data = {
            "email": self.tmp_email,
            "password": 'password',
        }

        resp = self.client.post(self.url, json.dumps(data),
                'application/json')

        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['email'] == self.tmp_email

        ccnet_email = ccnet_api.get_emailuser(self.tmp_email)
        assert ccnet_email.email == self.tmp_email

        self.remove_user(self.tmp_email)

    def test_create_with_invalid_user_permission(self):
        self.login_as(self.user)

        self.tmp_email = '%s@email.com' % randstring(10)

        # copy folders
        data = {
            "email": self.tmp_email,
            "password": 'password',
        }

        resp = self.client.post(self.url, json.dumps(data),
                'application/json')

        self.assertEqual(403, resp.status_code)

class AdminUserTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.tmp_email = '%s@email.com' % randstring(10)
        self.password = randstring(10)
        self.url = reverse('api-v2.1-admin-user', args=[self.tmp_email])

        ccnet_api.add_emailuser(self.tmp_email, self.password, 0, 0)
        self.clear_cache()

    def tearDown(self):
        self.remove_user(self.tmp_email)

    def get_user_info(self):
        self.login_as(self.admin)
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        return json_resp

    def test_get_user(self):
        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['email'] == self.tmp_email

        assert json_resp.has_key('email')
        assert json_resp.has_key('name')
        assert json_resp.has_key('contact_email')
        assert json_resp.has_key('is_staff')
        assert json_resp.has_key('is_active')
        assert json_resp.has_key('create_time')
        assert json_resp.has_key('department')
        assert json_resp.has_key('quota_total')
        assert json_resp.has_key('quota_usage')

    def test_get_with_invalid_user_permission(self):
        self.login_as(self.user)

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_update_is_active(self):

        self.login_as(self.admin)

        # acitve user
        data = {"email": self.tmp_email, "is_active": 'true'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['is_active'] == True

        ccnet_email = ccnet_api.get_emailuser(self.tmp_email)
        assert ccnet_email.is_active == True

        # inacitve user
        data = {"email": self.tmp_email, "is_active": 'False'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['is_active'] == False

        ccnet_email = ccnet_api.get_emailuser(self.tmp_email)
        assert ccnet_email.is_active == False

    def test_update_is_staff(self):

        self.login_as(self.admin)

        # make user staff
        data = {"email": self.tmp_email, "is_staff": 'true'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['is_staff'] == True

        ccnet_email = ccnet_api.get_emailuser(self.tmp_email)
        assert ccnet_email.is_staff == True

        # make user not staff
        data = {"email": self.tmp_email, "is_staff": 'False'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['is_staff'] == False

        ccnet_email = ccnet_api.get_emailuser(self.tmp_email)
        assert ccnet_email.is_staff == False

    def test_update_role(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)

        # change user to guest user
        data = {"email": self.tmp_email, "role": GUEST_USER}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['role'] == GUEST_USER

        ccnet_email = ccnet_api.get_emailuser(self.tmp_email)
        assert ccnet_email.role == GUEST_USER

        # change user to default user
        data = {"email": self.tmp_email, "role": DEFAULT_USER}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['role'] == DEFAULT_USER

        ccnet_email = ccnet_api.get_emailuser(self.tmp_email)
        assert ccnet_email.role == DEFAULT_USER

    def test_update_password(self):

        self.login_as(self.admin)

        # change user password
        password = randstring(10)
        data = {"email": self.tmp_email, "password": password}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        assert ccnet_api.validate_emailuser(self.tmp_email, password) == 0

    def test_update_name(self):

        self.login_as(self.admin)

        # change user name
        tmp_name = randstring(10)
        data = {"email": self.tmp_email, "name": tmp_name}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['name'] == tmp_name

        assert email2nickname(self.tmp_email) == tmp_name

    def test_update_contact_email(self):

        self.login_as(self.admin)

        # change user name
        tmp_email = randstring(10) + '@seafile.test'
        data = {'contact_email': tmp_email}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['contact_email'] == tmp_email

        assert email2contact_email(self.tmp_email) == tmp_email

    def test_update_contact_email_with_invalid(self):
        self.login_as(self.admin)

        # change user name
        tmp_email = randstring(10)
        data = {'contact_email': tmp_email}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(400, resp.status_code)


    def test_update_department(self):

        self.login_as(self.admin)

        # change user name
        department = randstring(10)
        data = {"email": self.tmp_email, "department": department}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['department'] == department

        d_profile = DetailedProfile.objects.get_detailed_profile_by_user(self.tmp_email)
        assert d_profile.department == department

    def test_update_quota_total(self):

        self.login_as(self.admin)

        # change user name
        quota_total = 1232
        data = {"email": self.tmp_email, "quota_total": quota_total}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        quota_total_mb = quota_total * get_file_size_unit('mb')
        assert json_resp['quota_total'] == quota_total_mb
        assert seafile_api.get_user_quota(self.tmp_email) == quota_total_mb

    def test_delete_user(self):
        self.login_as(self.admin)

        resp = self.client.delete(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['success'] == True

        assert ccnet_api.get_emailuser(self.tmp_email) is None

    def test_delete_with_invalid_user_permission(self):
        self.login_as(self.user)
        resp = self.client.delete(self.url)
        self.assertEqual(403, resp.status_code)

    def test_update_login_id(self):
        self.login_as(self.admin)

        data = {"email": self.tmp_email, "login_id": ''}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        assert json_resp['login_id'] == ''

        data = {"email": self.tmp_email, "login_id": 'lg_id'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        assert json_resp['login_id'] == 'lg_id'

        data = {"email": self.tmp_email, "login_id": ''}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        assert json_resp['login_id'] == ''

    def test_update_reference_id(self):
        self.login_as(self.admin)

        data = {"email": self.tmp_email, "reference_id": ''}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        assert json_resp['reference_id'] == ''

        data = {"email": self.tmp_email, "reference_id": 'rf@id.com'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        assert json_resp['reference_id'] == 'rf@id.com'

        data = {"email": self.tmp_email, "reference_id": ''}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)

    def test_put_same_reference_id(self):
        self.login_as(self.admin)

        admin_url = reverse('api-v2.1-admin-user', args=[self.admin.email])
        data = {"email": self.admin.email, "reference_id": 'test@email.com'}
        resp = self.client.put(admin_url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        assert resp.status_code == 200
        assert json_resp['reference_id'] == 'test@email.com'

        data = {"email": self.tmp_email, "reference_id": 'test@email.com'}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
        json_resp = json.loads(resp.content)
        assert resp.status_code == 400

        data = {"email": self.admin.email, "reference_id": ''}
        resp = self.client.put(admin_url, json.dumps(data),
                'application/json')
        data = {"email": self.tmp_email, "reference_id": ''}
        resp = self.client.put(self.url, json.dumps(data),
                'application/json')
