"""Unit Tests for the termsandconditions module"""

# pylint: disable=R0904, C0103

from django.core import mail
from django.http import HttpResponseRedirect
from django.conf import settings
from django.test import TestCase, RequestFactory
from django.contrib.auth.models import User
from django.template import Context, Template
from django.utils import timezone
from .models import TermsAndConditions, UserTermsAndConditions, DEFAULT_TERMS_SLUG
from .pipeline import user_accept_terms
from .templatetags.terms_tags import show_terms_if_not_agreed
import logging
from importlib import import_module

LOGGER = logging.getLogger(name='termsandconditions')


class TermsAndConditionsTests(TestCase):
    """Tests Terms and Conditions Module"""

    def setUp(self):
        """Setup for each test"""
        LOGGER.debug('Test Setup')

        self.user1 = User.objects.create_user('user1', 'user1@user1.com', 'user1password')
        self.user2 = User.objects.create_user('user2', 'user2@user2.com', 'user2password')
        self.terms1 = TermsAndConditions.objects.create(slug="site-terms", name="Site Terms",
                                                        text="Site Terms and Conditions 1", version_number=1.0,
                                                        date_active="2012-01-01")
        self.terms2 = TermsAndConditions.objects.create(slug="site-terms", name="Site Terms",
                                                        text="Site Terms and Conditions 2", version_number=2.0,
                                                        date_active="2012-01-05")
        self.terms3 = TermsAndConditions.objects.create(slug="contrib-terms", name="Contributor Terms",
                                                        text="Contributor Terms and Conditions 1.5", version_number=1.5,
                                                        date_active="2012-01-01")
        self.terms4 = TermsAndConditions.objects.create(slug="contrib-terms", name="Contributor Terms",
                                                        text="Contributor Terms and Conditions 2", version_number=2.0,
                                                        date_active="2100-01-01")

    def tearDown(self):
        """Teardown for each test"""
        LOGGER.debug('Test TearDown')
        User.objects.all().delete()
        TermsAndConditions.objects.all().delete()
        UserTermsAndConditions.objects.all().delete()

    def test_agreed_to(self):
        """Test the agreed_to_terms static method"""
        LOGGER.debug("Test that user1 has not agreed to terms1.")
        self.assertFalse(TermsAndConditions.agreed_to_terms(self.user1, self.terms1))

    def test_social_redirect(self):
        """Test the agreed_to_terms redirect from social pipeline"""
        LOGGER.debug("Test the social pipeline")
        response = user_accept_terms('backend', self.user1, '123')
        self.assertIsInstance(response, HttpResponseRedirect)

        UserTermsAndConditions.objects.create(user=self.user1, terms=self.terms2)
        response = user_accept_terms('backend', self.user1, '123')
        self.assertIsInstance(response, dict)

    def test_get_active_list(self):
        """Test get list of active T&Cs"""
        active_list = TermsAndConditions.get_active_list()
        self.assertEqual(2, len(active_list))

    def test_terms_and_conditions_models(self):
        """Various tests of the TermsAndConditions Module"""

        # Testing Direct Assignment of Acceptance
        UserTermsAndConditions.objects.create(user=self.user1, terms=self.terms1)
        UserTermsAndConditions.objects.create(user=self.user2, terms=self.terms3)

        self.assertEqual(1.0, self.user1.userterms.get().terms.version_number)
        self.assertEqual(1.5, self.user2.userterms.get().terms.version_number)

        self.assertEqual('user1', self.terms1.users.all()[0].username)

        # Testing the get_active static method of TermsAndConditions
        self.assertEqual(2.0, TermsAndConditions.get_active(slug='site-terms').version_number)
        self.assertEqual(1.5, TermsAndConditions.get_active(slug='contrib-terms').version_number)

        # Testing the agreed_to_latest static method of TermsAndConditions
        self.assertEqual(False, TermsAndConditions.agreed_to_latest(user=self.user1, slug='site-terms'))
        self.assertEqual(True, TermsAndConditions.agreed_to_latest(user=self.user2, slug='contrib-terms'))

        # Testing the unicode method of TermsAndConditions
        self.assertEqual('site-terms-2.00', str(TermsAndConditions.get_active(slug='site-terms')))
        self.assertEqual('contrib-terms-1.50', str(TermsAndConditions.get_active(slug='contrib-terms')))

    def test_middleware_redirect(self):
        """Validate that a user is redirected to the terms accept page if they are logged in, and decorator is on method"""

        UserTermsAndConditions.objects.all().delete()

        LOGGER.debug('Test user1 login for middleware')
        login_response = self.client.login(username='user1', password='user1password')
        self.assertTrue(login_response)

        LOGGER.debug('Test /secure/ after login')
        logged_in_response = self.client.get('/secure/', follow=True)
        self.assertRedirects(logged_in_response, 'http://testserver/terms/accept/contrib-terms?returnTo=/secure/')

    def test_terms_required_redirect(self):
        """Validate that a user is redirected to the terms accept page if logged in, and decorator is on method"""

        LOGGER.debug('Test /termsrequired/ pre login')
        not_logged_in_response = self.client.get('/termsrequired/', follow=True)
        self.assertRedirects(not_logged_in_response, 'http://testserver/accounts/login/?next=/termsrequired/')

        LOGGER.debug('Test user1 login')
        login_response = self.client.login(username='user1', password='user1password')
        self.assertTrue(login_response)

        LOGGER.debug('Test /termsrequired/ after login')
        logged_in_response = self.client.get('/termsrequired/', follow=True)
        self.assertRedirects(logged_in_response, 'http://testserver/terms/accept/?returnTo=/termsrequired/')

        LOGGER.debug('Test no redirect for /termsrequired/ after accept')
        accepted_response = self.client.post('/terms/accept/', {'terms': 2, 'returnTo': '/termsrequired/'}, follow=True)
        self.assertContains(accepted_response, "Terms and Conditions Acceptance Required")
        LOGGER.debug('Test response after termsrequired accept')
        terms_required_response = self.client.get('/termsrequired/', follow=True)
        self.assertContains(terms_required_response, "Terms and Conditions Acceptance Required")

    def test_accept(self):
        """Validate that accepting terms works"""

        LOGGER.debug('Test user1 login for accept')
        login_response = self.client.login(username='user1', password='user1password')
        self.assertTrue(login_response)

        LOGGER.debug('Test /terms/accept/ get')
        accept_response = self.client.get('/terms/accept/', follow=True)
        self.assertContains(accept_response, "Accept")

        LOGGER.debug('Test /terms/accept/ post')
        chained_terms_response = self.client.post('/terms/accept/', {'terms': 2, 'returnTo': '/secure/'}, follow=True)
        self.assertContains(chained_terms_response, "Contributor")

        self.assertEqual(True, TermsAndConditions.agreed_to_latest(user=self.user1, slug='site-terms'))

        LOGGER.debug('Test /terms/accept/contrib-terms/1.5/ post')
        accept_version_response = self.client.get('/terms/accept/contrib-terms/1.5/', follow=True)
        self.assertContains(accept_version_response, "Contributor Terms and Conditions 1.5")

        LOGGER.debug('Test /terms/accept/contrib-terms/3/ post')
        accept_version_post_response = self.client.post('/terms/accept/', {'terms': 3, 'returnTo': '/secure/'}, follow=True)
        self.assertContains(accept_version_post_response, "Secure")
        self.assertTrue(TermsAndConditions.agreed_to_terms(user=self.user1, terms=self.terms3))

    def test_accept_store_ip_address(self):
        """Test with IP address storage setting true (default)"""
        self.client.login(username='user1', password='user1password')
        self.client.post('/terms/accept/', {'terms': 2, 'returnTo': '/secure/'}, follow=True)
        user_terms = UserTermsAndConditions.objects.all()[0]
        self.assertEqual(user_terms.user, self.user1)
        self.assertEqual(user_terms.terms, self.terms2)
        self.assertTrue(user_terms.ip_address)

    def test_accept_no_ip_address(self):
        """Test with IP address storage setting false"""
        self.client.login(username='user1', password='user1password')
        with self.settings(TERMS_STORE_IP_ADDRESS=False):
            self.client.post('/terms/accept/', {'terms': 2, 'returnTo': '/secure/'}, follow=True)
            user_terms = UserTermsAndConditions.objects.all()[0]
            self.assertFalse(user_terms.ip_address)

    def test_auto_create(self):
        """Validate that a terms are auto created if none exist"""
        LOGGER.debug('Test auto create terms')

        TermsAndConditions.objects.all().delete()

        num_terms = TermsAndConditions.objects.count()
        self.assertEqual(0, num_terms)

        LOGGER.debug('Test user1 login for autocreate')
        login_response = self.client.login(username='user1', password='user1password')
        self.assertTrue(login_response)

        LOGGER.debug('Test /termsrequired/ after login with no TermsAndConditions')
        logged_in_response = self.client.get('/termsrequired/', follow=True)
        self.assertRedirects(logged_in_response, 'http://testserver/terms/accept/?returnTo=/termsrequired/')

        LOGGER.debug('Test TermsAndConditions Object Was Created')
        num_terms = TermsAndConditions.objects.count()
        self.assertEqual(1, num_terms)

        terms = TermsAndConditions.objects.get()
        self.assertEqual('site-terms-1.00', str(terms))

        LOGGER.debug('Test Not Creating Non-Default TermsAndConditions')
        non_default_response = self.client.get('/terms/accept/contrib-terms/', follow=True)
        self.assertEqual(404, non_default_response.status_code)

    def test_terms_upgrade(self):
        """Validate a user is prompted to accept terms again when new version comes out"""

        UserTermsAndConditions.objects.create(user=self.user1, terms=self.terms2)

        LOGGER.debug('Test user1 login pre upgrade')
        login_response = self.client.login(username='user1', password='user1password')
        self.assertTrue(login_response)

        LOGGER.debug('Test user1 not redirected after login')
        logged_in_response = self.client.get('/secure/', follow=True)
        self.assertContains(logged_in_response, "Contributor")

        # First, Accept Contributor Terms
        LOGGER.debug('Test /terms/accept/contrib-terms/3/ post')
        self.client.post('/terms/accept/', {'terms': 3, 'returnTo': '/secure/'}, follow=True)

        LOGGER.debug('Test upgrade terms')
        self.terms5 = TermsAndConditions.objects.create(slug="site-terms", name="Site Terms",
                                                        text="Terms and Conditions2", version_number=2.5,
                                                        date_active="2012-02-05")

        LOGGER.debug('Test user1 is redirected when changing pages')
        post_upgrade_response = self.client.get('/secure/', follow=True)
        self.assertRedirects(post_upgrade_response, 'http://testserver/terms/accept/site-terms?returnTo=/secure/')

    def test_no_middleware(self):
        """Test a secure page with the middleware excepting it"""

        UserTermsAndConditions.objects.create(user=self.user1, terms=self.terms2)

        LOGGER.debug('Test user1 login no middleware')
        login_response = self.client.login(username='user1', password='user1password')
        self.assertTrue(login_response)

        LOGGER.debug('Test user1 not redirected after login')
        logged_in_response = self.client.get('/securetoo/', follow=True)
        self.assertContains(logged_in_response, "SECOND")

        LOGGER.debug("Test startswith '/admin' pages not redirecting")
        admin_response = self.client.get('/admin', follow=True)
        self.assertContains(admin_response, "administration")

    def test_terms_view(self):
        """Test Accessing the View Terms and Conditions Functions"""

        LOGGER.debug('Test /terms/')
        root_response = self.client.get('/terms/', follow=True)
        self.assertContains(root_response, 'Terms and Conditions')

        LOGGER.debug('Test /terms/view/site-terms')
        slug_response = self.client.get('/terms/view/site-terms', follow=True)
        self.assertContains(slug_response, 'Terms and Conditions')

        LOGGER.debug('Test /terms/view/site-terms/1.5')
        version_response = self.client.get('/terms/view/site-terms/1.0', follow=True)
        self.assertContains(version_response, 'Terms and Conditions')

    def test_user_pipeline(self):
        """Test the case of a user being partially created via the django-socialauth pipeline"""

        LOGGER.debug('Test /terms/accept/ post for no user')
        no_user_response = self.client.post('/terms/accept/', {'terms': 2}, follow=True)
        self.assertContains(no_user_response, "Home")

        user = {'pk': 1}
        kwa = {'user': user}
        partial_pipeline = {'kwargs': kwa}

        engine = import_module(settings.SESSION_ENGINE)
        store = engine.SessionStore()
        store.save()
        self.client.cookies[settings.SESSION_COOKIE_NAME] = store.session_key

        session = self.client.session
        session["partial_pipeline"] = partial_pipeline
        session.save()

        self.assertTrue('partial_pipeline' in self.client.session)

        LOGGER.debug('Test /terms/accept/ post for pipeline user')
        pipeline_response = self.client.post('/terms/accept/', {'terms': 2, 'returnTo': '/anon'}, follow=True)
        self.assertContains(pipeline_response, "Anon")

    def test_email_terms(self):
        """Test emailing terms and conditions"""
        LOGGER.debug('Test /terms/email/')
        email_form_response = self.client.get('/terms/email/', follow=True)
        self.assertContains(email_form_response, 'Email')

        LOGGER.debug('Test /terms/email/ post, expecting email fail')
        email_send_response = self.client.post('/terms/email/',
                                               {'email_address': 'foo@foo.com', 'email_subject': 'Terms Email',
                                                'terms': 2, 'returnTo': '/'}, follow=True)
        self.assertEqual(len(mail.outbox), 1)  # Check that there is one email in the test outbox
        self.assertContains(email_send_response, 'Sent')

        LOGGER.debug('Test /terms/email/ post, expecting email fail')
        email_fail_response = self.client.post('/terms/email/', {'email_address': 'INVALID EMAIL ADDRESS',
                                                                 'email_subject': 'Terms Email', 'terms': 2,
                                                                 'returnTo': '/'}, follow=True)
        self.assertContains(email_fail_response, 'Invalid')


class TermsAndConditionsTemplateTagsTestCase(TestCase):
    def setUp(self):
        """Setup for each test"""
        self.user1 = User.objects.create_user(
            'user1', 'user1@user1.com', 'user1password')
        self.template_string_1 = (
            '{% load terms_tags %}'
            '{% show_terms_if_not_agreed %}'
        )
        self.template_string_2 = (
            '{% load terms_tags %}'
            '{% show_terms_if_not_agreed slug="specific-terms" %}'
        )

    def _make_context(self, url):
        """Build Up Context - Used in many tests"""
        context = dict()
        context['request'] = RequestFactory()
        context['request'].user = self.user1
        context['request'].META = {'PATH_INFO': url}
        return context

    def render_template(self, string, context=None):
        """a helper method to render simplistic test templates"""
        request = RequestFactory().get('/test')
        request.user = self.user1
        request.context = context or {}
        return Template(string).render(Context({'request': request}))

    def test_show_terms_if_not_agreed(self):
        """test if show_terms_if_not_agreed template tag renders html code"""
        rendered = self.render_template(self.template_string_1)
        terms = TermsAndConditions.get_active()
        self.assertIn(terms.slug, rendered)

    def test_not_show_terms_if_agreed(self):
        """test if show_terms_if_not_agreed template tag does not load if user
        agreed terms"""
        terms = TermsAndConditions.get_active()
        UserTermsAndConditions.objects.create(terms=terms, user=self.user1)
        rendered = self.render_template(self.template_string_1)
        self.assertNotIn(terms.slug, rendered)

    def test_show_terms_if_not_agreed_by_slug(self):
        """Test if show_terms not agreed to by looking up slug"""
        terms = TermsAndConditions.objects.create(
            slug='specific-terms',
            date_active=timezone.now()
        )
        rendered = self.render_template(self.template_string_2)
        self.assertIn(terms.slug, rendered)

    def test_show_terms_if_not_agreed_on_protected_url_not_agreed(self):
        """Check terms on protected url if not agreed"""
        context = self._make_context('/test')
        result = show_terms_if_not_agreed(context)
        terms = TermsAndConditions.get_active(slug=DEFAULT_TERMS_SLUG)
        self.assertDictEqual(result, {'terms': terms})

    def test_show_terms_if_not_agreed_on_unprotected_url_not_agreed(self):
        """Check terms on unprotected url if not agreed"""
        context = self._make_context('/')
        result = show_terms_if_not_agreed(context)
        self.assertDictEqual(result, {})


class TermsAndConditionsModelsTestCase(TestCase):
    """Tests Models for T&C"""

    def setUp(self):
        """Set Up T&C Model Tests"""
        self.terms_1 = TermsAndConditions.objects.create(
            name='terms_1',
            date_active=timezone.now()
        )
        self.terms_2 = TermsAndConditions.objects.create(
            name='terms_2',
            date_active=None
        )

    def test_tnc_default_slug(self):
        """test if default slug is used"""
        self.assertEqual(self.terms_1.slug, DEFAULT_TERMS_SLUG)

    def test_tnc_get_active(self):
        """test if right terms are active"""
        active = TermsAndConditions.get_active()
        self.assertEqual(active.name, self.terms_1.name)
        self.assertNotEqual(active.name, self.terms_2.name)
