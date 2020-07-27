import json
import logging

from django.urls import reverse

from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring
from seahub.institutions.models import Institution, InstitutionAdmin
from seahub.profile.models import Profile
logger = logging.getLogger(__name__)


class AdminInstitutionUsersTest(BaseTestCase):

    def setUp(self):
        pass

    def _add_institution(self, name=''):
        return Institution.objects.create(name=name)

    def _delete_institution(self, name=''):
        try:
            institution = Institution.objects.get(name=name)
            institution.delete()
        except Exception as e:
            logger.error(e)


    def test_can_get(self):
        self.login_as(self.admin)
        inst = self._add_institution('int1')
        url = reverse('api-v2.1-admin-institution-users', args=[inst.id])
        resp = self.client.get(url)

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert type(json_resp['user_list']) is list

        inst.delete()

    def test_no_permission(self):
        self.logout()
        self.login_as(self.admin_no_other_permission)
        inst = self._add_institution('int1')
        url = reverse('api-v2.1-admin-institution-users', args=[inst.id])
        resp = self.client.get(url)

        self.assertEqual(403, resp.status_code)

    def test_can_create(self):
        self.login_as(self.admin)
        inst = self._add_institution('int1')
        url = reverse('api-v2.1-admin-institution-users', args=[inst.id])
        data = {
            'email': 'invalid_email_string',
        }
        resp = self.client.post(url, data)

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert type(json_resp['success']) is list
        assert type(json_resp['failed']) is list


class AdminInstitutionUserTest(BaseTestCase):

    def setUp(self):
        pass

    def _add_institution(self, name=''):
        return Institution.objects.create(name=name)

    def _delete_institution(self, name=''):
        try:
            institution = Institution.objects.get(name=name)
            institution.delete()
        except Exception as e:
            logger.error(e)

    def _add_user_in_institution(self, email, inst_name):
        profile = Profile.objects.get_profile_by_user(email)
        if not profile:
            profile = Profile.objects.add_or_update(username=email, institution=inst_name)
        else:
            profile.institution = inst_name
        profile.save()

    def test_can_update(self):
        self.login_as(self.admin)
        inst = self._add_institution('int1')
        self._add_user_in_institution(self.user.email, inst.name)

        url = reverse('api-v2.1-admin-institution-user', args=[inst.id, self.user.email])
        data = 'is_institution_admin=True'
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['is_institution_admin'] is True

        inst.delete()

    def test_can_delete(self):
        self.login_as(self.admin)
        inst = self._add_institution('int1')
        self._add_user_in_institution(self.user.email, inst.name)

        url = reverse('api-v2.1-admin-institution-user', args=[inst.id, self.user.email])
        resp = self.client.delete(url)

        self.assertEqual(200, resp.status_code)

        inst.delete()
