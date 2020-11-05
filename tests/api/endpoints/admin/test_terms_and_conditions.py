import json

from django.urls import reverse

from seahub.test_utils import BaseTestCase
from termsandconditions.models import TermsAndConditions, UserTermsAndConditions


class AdminTermsAndConditionsTest(BaseTestCase):
    def setUp(self):
        from constance import config
        self.config = config
        self.config.ENABLE_TERMS_AND_CONDITIONS = True
        self.url = reverse('api-v2.1-admin-terms-and-conditions')

    def _add_term(self, name, text, version_number):
        return TermsAndConditions.objects.create(
            name=name, version_number=version_number, text=text,
            date_active=None)

    def test_can_get(self):
        self.login_as(self.admin)
        term1 = self._add_term(name='term1', text='text1', version_number=1)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert type(json_resp['term_and_condition_list']) is list
        assert json_resp['term_and_condition_list'][0]['name'] == term1.name
        assert json_resp['term_and_condition_list'][0]['text'] == term1.text
        term1.delete()

    def test_no_permission(self):
        self.login_as(self.admin_no_other_permission)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_get_permission_denied(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_can_create(self):
        self.login_as(self.admin)
        data = {
            "name": "test_name",
            "text": "test_text",
            "version_number": 1,
            "is_active": False,
        }

        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)


class AdminTermAndConditionTest(BaseTestCase):

    def setUp(self):
        from constance import config
        self.config = config
        self.config.ENABLE_TERMS_AND_CONDITIONS = True

    def _add_term(self, name, text, version_number):
        return TermsAndConditions.objects.create(
            name=name, version_number=version_number, text=text,
            date_active=None)

    def test_can_delete(self):
        self.login_as(self.admin)
        term = self._add_term('name', 'text', 1)
        url = reverse('api-v2.1-admin-term-and-condition', args=[term.id])

        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)

    def test_delete_permission_denied(self):
        self.login_as(self.user)
        term = self._add_term('name', 'text', 1)
        url = reverse('api-v2.1-admin-term-and-condition', args=[term.id])

        resp = self.client.delete(url)
        self.assertEqual(403, resp.status_code)
