# Copyright (c) 2012-2016 Seafile Ltd.
from django.test import TestCase, SimpleTestCase, RequestFactory
from django.http import HttpResponse
from unittest.mock import Mock, patch
from . import middleware
from .middleware import RedirectMiddleware, get_subdomain, construct_org_url
from .forms import OrgRegistrationForm


class OrgRegistrationFormTest(SimpleTestCase):

    @patch('seahub.organizations.forms.User.objects.get')
    @patch('seahub.organizations.forms.Profile.objects.filter')
    def test_rejects_email_with_profile_but_no_user(self, mock_filter, mock_get):
        mock_filter.return_value.exists.return_value = True
        form = OrgRegistrationForm({'email': 'Existing@Example.com'})

        self.assertFalse(form.is_valid())
        self.assertEqual(form.errors['email'], ['A user with this email already exists.'])
        mock_filter.assert_called_once_with(contact_email='existing@example.com')
        mock_get.assert_not_called()

    @patch('seahub.organizations.forms.User.objects.get')
    @patch('seahub.organizations.forms.Profile.objects.filter')
    def test_rejects_existing_user_without_profile(self, mock_filter, mock_get):
        mock_filter.return_value.exists.return_value = False
        form = OrgRegistrationForm({'email': 'existing@example.com'})

        self.assertFalse(form.is_valid())
        self.assertIn('email', form.errors)
        mock_get.assert_called_once_with(email='existing@example.com')

    @patch('seahub.organizations.forms.User.objects.get')
    @patch('seahub.organizations.forms.Profile.objects.filter')
    def test_accepts_unused_email(self, mock_filter, mock_get):
        from seahub.base.accounts import User
        mock_filter.return_value.exists.return_value = False
        mock_get.side_effect = User.DoesNotExist
        form = OrgRegistrationForm({'email': 'New@Example.com'})

        form.is_valid()

        self.assertNotIn('email', form.errors)
        self.assertEqual(form.cleaned_data['email'], 'new@example.com')


class RedirectMiddlewareTest(TestCase):

    def setUp(self):
        self.get_response = Mock(return_value=HttpResponse())
        self.rm = RedirectMiddleware(self.get_response)
        self.factory = RequestFactory()

    def test_get_subdomain(self):
        d = {
            'https://seacloud.cc': 'foo.seacloud.cc',
            'https://seacloud.cc:8000': 'foo.seacloud.cc:8000',
            'https://seacloud.cc:8000/': 'foo.seacloud.cc:8000',
            'https://seacloud.com.cn:8000/': 'foo.seacloud.com.cn:8000',
            'https://seafile.mysite.edu.net:8000/': 'foo.seafile.mysite.edu.net:8000',
        }
        for service_url, domain in list(d.items()):
            middleware.get_service_url = lambda: service_url
            self.assertEqual(get_subdomain(domain), 'foo')

        d = {
            'https://seacloud.cc': 'seacloud.cc',
            'https://seacloud.cc:8000': 'seacloud.cc:8000',
            'https://seacloud.cc:8000/': 'seacloud.cc:8000',
            'https://seacloud.com.cn:8000/': 'seacloud.com.cn:8000',
            'https://seafile.mysite.edu.net:8000/': 'seafile.mysite.edu.net:8000',
        }
        for service_url, domain in list(d.items()):
            middleware.get_service_url = lambda: service_url
            self.assertIsNone(get_subdomain(domain))

    def test_construct_org_url(self):
        url_prefix = 'foo'
        path = '/home/my/'
        service_url = 'https://seafile.mysite.edu.net:8000/'
        middleware.get_service_url = lambda: service_url
        self.assertEqual(
            construct_org_url(url_prefix, path),
            'https://foo.seafile.mysite.edu.net:8000/home/my/'
        )

    @patch('seahub.organizations.middleware.ORG_REDIRECT', False)
    @patch('seahub.organizations.middleware.settings')
    def test_passes_through_when_multi_tenancy_disabled(self, mock_settings):
        mock_settings.MULTI_TENANCY = False
        request = self.factory.get('/home/')
        request.user = Mock(is_anonymous=False, org=None)
        response = self.rm(request)
        self.get_response.assert_called_once_with(request)

    @patch('seahub.organizations.middleware.ORG_REDIRECT', False)
    @patch('seahub.organizations.middleware.settings')
    def test_passes_through_when_org_redirect_disabled(self, mock_settings):
        mock_settings.MULTI_TENANCY = True
        request = self.factory.get('/home/')
        request.user = Mock(is_anonymous=False, org=None)
        response = self.rm(request)
        self.get_response.assert_called_once_with(request)

    @patch('seahub.organizations.middleware.ORG_REDIRECT', True)
    @patch('seahub.organizations.middleware.settings')
    def test_passes_through_for_anonymous_user(self, mock_settings):
        mock_settings.MULTI_TENANCY = True
        request = self.factory.get('/home/')
        request.user = Mock(is_anonymous=True)
        response = self.rm(request)
        self.get_response.assert_called_once_with(request)
