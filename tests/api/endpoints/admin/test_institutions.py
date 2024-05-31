import json
import logging
from mock import patch

from django.urls import reverse

from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring
from seahub.institutions.models import Institution

logger = logging.getLogger(__name__)


class InstitutionsTest(BaseTestCase):

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

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_can_get(self, mock_is_pro_version):

        mock_is_pro_version.return_value = True

        self.login_as(self.admin)
        inst = self._add_institution('int1')
        url = reverse('api-v2.1-admin-institutions')
        resp = self.client.get(url)

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['institution_list'][0]['name'] == 'int1'
        assert json_resp['total_count'] == 1

        inst.delete()

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_no_permission(self, mock_is_pro_version):

        mock_is_pro_version.return_value = True

        self.logout()
        self.login_as(self.admin_no_other_permission)
        inst = self._add_institution('int1')
        url = reverse('api-v2.1-admin-institutions')
        resp = self.client.get(url)

        self.assertEqual(403, resp.status_code)
        inst.delete()

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_can_create(self, mock_is_pro_version):

        mock_is_pro_version.return_value = True

        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-institutions')

        institution_name = randstring(10)

        data = {
            'name': institution_name,
        }
        resp = self.client.post(url, data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['name'] == institution_name

        self._delete_institution(institution_name)


class InstitutionTest(BaseTestCase):

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

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_can_get(self, mock_is_pro_version):

        mock_is_pro_version.return_value = True

        self.login_as(self.admin)
        institution_name = randstring(10)
        inst = self._add_institution(institution_name)
        url = reverse('api-v2.1-admin-institution', args=[inst.id])
        resp = self.client.get(url)

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['id'] == inst.id
        assert json_resp['name'] == institution_name

        inst.delete()

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_can_update(self, mock_is_pro_version):

        mock_is_pro_version.return_value = True

        self.login_as(self.admin)
        institution_name = randstring(10)
        inst = self._add_institution(institution_name)
        url = reverse('api-v2.1-admin-institution', args=[inst.id])

        data = 'quota=1024'
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['quota_total'] == 1024 * 1000 * 1000

        inst.delete()

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_can_delete(self, mock_is_pro_version):

        mock_is_pro_version.return_value = True

        self.login_as(self.admin)
        institution_name = randstring(10)
        inst = self._add_institution(institution_name)
        url = reverse('api-v2.1-admin-institution', args=[inst.id])
        resp = self.client.delete(url)

        self.assertEqual(200, resp.status_code)
