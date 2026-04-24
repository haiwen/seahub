# Copyright (c) 2012-2016 Seafile Ltd.
from django.test import SimpleTestCase, RequestFactory
from django.http import HttpResponse
from unittest.mock import Mock, patch

from seahub.institutions.middleware import InstitutionMiddleware


def dummy_get_response(request):
    return HttpResponse('OK')


class FakeDoesNotExist(Exception):
    pass


class InstitutionMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def _make_request(self, username='user@test.com'):
        request = self.factory.get('/')
        request.user = Mock(username=username)
        return request

    @patch('seahub.institutions.middleware.settings')
    def test_passes_through_when_multi_institution_disabled(self, mock_settings):
        mock_settings.MULTI_INSTITUTION = False
        get_response = Mock(return_value=HttpResponse())
        mw = InstitutionMiddleware(get_response)
        request = self._make_request()
        mw(request)
        get_response.assert_called_once_with(request)

    @patch('seahub.institutions.middleware.InstitutionAdmin')
    @patch('seahub.institutions.middleware.settings')
    def test_sets_inst_admin_false_when_not_admin(
            self, mock_settings, mock_inst_admin):
        mock_settings.MULTI_INSTITUTION = True
        mock_inst_admin.DoesNotExist = FakeDoesNotExist
        mock_inst_admin.objects.get.side_effect = FakeDoesNotExist

        mw = InstitutionMiddleware(dummy_get_response)
        request = self._make_request()
        mw(request)
        self.assertFalse(request.user.inst_admin)

    @patch('seahub.institutions.middleware.InstitutionAdmin')
    @patch('seahub.institutions.middleware.settings')
    def test_sets_inst_admin_true_and_institution_when_admin(
            self, mock_settings, mock_inst_admin):
        mock_settings.MULTI_INSTITUTION = True
        institution = Mock()
        inst_admin_obj = Mock(institution=institution)
        mock_inst_admin.objects.get.return_value = inst_admin_obj

        mw = InstitutionMiddleware(dummy_get_response)
        request = self._make_request()
        mw(request)

        self.assertTrue(request.user.inst_admin)
        self.assertEqual(request.user.institution, institution)

    @patch('seahub.institutions.middleware.InstitutionAdmin')
    @patch('seahub.institutions.middleware.settings')
    def test_calls_get_response_in_all_cases(
            self, mock_settings, mock_inst_admin):
        mock_settings.MULTI_INSTITUTION = True
        mock_inst_admin.DoesNotExist = FakeDoesNotExist
        mock_inst_admin.objects.get.side_effect = FakeDoesNotExist

        get_response = Mock(return_value=HttpResponse())
        mw = InstitutionMiddleware(get_response)
        request = self._make_request()
        mw(request)
        get_response.assert_called_once_with(request)
