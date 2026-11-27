import ast
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock
from urllib.parse import urlparse

from django.http import HttpResponse
from django.template import Context, Engine, Library
from django.test import SimpleTestCase, override_settings
from django.urls import path
from django.utils.translation import override
from django.views.defaults import page_not_found, server_error
from django.views.generic import TemplateView


SEAHUB_ROOT = Path(__file__).resolve().parents[3] / 'seahub'


def template_engine():
    engine = Engine(
        dirs=[str(SEAHUB_ROOT / 'templates')] + [
            str(SEAHUB_ROOT / app / 'templates')
            for app in ('trusted_ip', 'two_factor', 'billing')
        ],
        libraries={
            'i18n': 'django.templatetags.i18n',
            'static': 'django.templatetags.static',
        },
    )
    engine.template_libraries['seahub_tags'] = Library()
    return engine


def page_context(**extra):
    context = {
        'request': SimpleNamespace(
            user=SimpleNamespace(is_authenticated=False), session={}),
        'site_title': 'Fixture Seafile',
        'site_description': '',
        'branding_css': '',
        'SITE_ROOT': '/',
        'MEDIA_URL': '/media/',
        'LANGUAGE_CODE': 'en',
        'LANGUAGES': [('en', 'English')],
        'logo_path': 'img/seafile-logo.png',
        'logo_width': 160,
        'logo_height': 40,
        'login_bg_image_path': 'img/login-bg.jpg',
        'login_url': '/accounts/login/',
    }
    context.update(extra)
    return Context(context)


def billing_fixture(enabled=True, profile=None, token='FIXTURE-ONLY-NOT-A-JWT',
                    auth_url='https://billing.invalid/auth/'):
    module = ast.parse((SEAHUB_ROOT / 'billing/views.py').read_text())
    function = next(node for node in module.body
                    if isinstance(node, ast.FunctionDef) and node.name == 'billing')
    decorators = [node.id for node in function.decorator_list]
    engine = template_engine()
    namespace = {
        'login_required': lambda view: view,
        'org_staff_required': lambda view: view,
        'ENABLE_EXTERNAL_BILLING_SERVICE': enabled,
        'BILLING_SERVICE_URL': 'https://billing.invalid/',
        'BILLING_SERVICE_JWT_AUTH_URL': auth_url,
        'BILLING_SERVICE_JWT_SECRET_KEY': 'fixture-signing-key',
        'BILLING_SERVICE_JWT_ALGORITHM': 'HS256',
        'BILLING_SERVICE_JWT_EXPIRATION': 300,
        'Profile': SimpleNamespace(objects=SimpleNamespace(
            get_profile_by_user=Mock(return_value=profile))),
        'get_service_url': Mock(return_value='https://seafile.invalid:8443/'),
        'render_error': Mock(return_value=HttpResponse('Billing is not enabled.')),
        'jwt': SimpleNamespace(encode=Mock(return_value=token)),
        'time': SimpleNamespace(time=Mock(return_value=1700000000)),
        'uuid': SimpleNamespace(uuid4=Mock(return_value='fixture-identifier')),
        'urlparse': urlparse,
        'HttpResponse': HttpResponse,
        'render_to_string': Mock(side_effect=lambda name, context:
                               engine.get_template(name).render(Context(context))),
    }
    executable = ast.Module(body=[function], type_ignores=[])
    exec(compile(executable, 'seahub/billing/views.py', 'exec'), namespace)
    request = SimpleNamespace(user=SimpleNamespace(
        username='fixture-user@seafile.invalid',
        org=SimpleNamespace(org_id=7, org_name='Fixture organization')))
    return namespace['billing'](request), namespace, decorators


def rendered_fixtures():
    engine = template_engine()
    cases = {
        '404': ('404.html', {}),
        '500': ('500.html', {}),
        'error': ('error.html', {'error_msg': 'Existing error message.'}),
        'organization-inactive': ('error.html', {
            'organization_inactive': True,
            'error_msg': 'Existing organization message.',
            'reactivate_link': 'https://seafile.invalid/reactivate/',
        }),
        'remote-user-error': ('remote_user/error.html', {}),
        'remote-user-registration-disabled': (
            'remote_user/create_unknown_user_false.html', {}),
        'remote-user-inactive': ('remote_user/not_active.html', {}),
        'shibboleth-complete': ('shibboleth/complete.html', {}),
        'shibboleth-success': ('shibboleth/success.html.template', {}),
        'payment-result': ('subscription/pay_result.html', {
            'info': 'Existing payment result.'}),
        'client-login-complete': ('client_login_complete.html', {}),
        'activation-complete': ('registration/activation_complete.html', {}),
        'registration-email-sent': ('registration/registration_complete.html', {
            'enable_signup': True, 'send_mail': True}),
        'registration-awaiting-activation': (
            'registration/registration_complete.html', {'enable_signup': True}),
        'registration-disabled': ('registration/registration_complete.html', {}),
        'password-reset-complete': ('registration/password_reset_complete.html', {}),
        'password-reset-done': ('registration/password_reset_done.html', {}),
        'password-change-done': ('registration/password_change_done.html', {}),
        'logout': ('registration/logout.html', {}),
        'logged-out': ('registration/logged_out.html', {}),
        'trusted-ip': ('trusted_ip/403_trusted_ip.html', {}),
        'two-factor-base': ('two_factor/_base.html', {}),
        'two-factor-focus': ('two_factor/_base_focus.html', {}),
    }
    fixtures = {
        name: engine.get_template(template).render(page_context(**context))
        for name, (template, context) in cases.items()
    }
    fixtures['billing'] = billing_fixture()[0].content.decode()
    return fixtures


urlpatterns = [path('i18n/', TemplateView.as_view(), name='i18n')]


class MarkupParser(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.title = ''
        self.in_title = False
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))
        if tag == 'title':
            self.in_title = True

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data

    def attributes(self, tag):
        return [attrs for name, attrs in self.elements if name == tag]


@override_settings(
    LANGUAGE_CODE='en',
    ROOT_URLCONF='tests.seahub.a11y.test_pages',
    STORAGES={'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}},
)
class StandaloneTemplateTest(SimpleTestCase):
    def test_every_fixture_has_a_descriptive_title_and_one_main(self):
        for name, html in rendered_fixtures().items():
            with self.subTest(name=name):
                page = MarkupParser(html)
                self.assertTrue(page.title.strip())
                self.assertNotEqual(page.title.strip(), 'Fixture Seafile')
                self.assertEqual(len(page.attributes('main')), 1)

    def test_user_facing_fixtures_declare_a_language(self):
        for name, html in rendered_fixtures().items():
            if name == 'billing':
                continue
            with self.subTest(name=name):
                page = MarkupParser(html)
                self.assertTrue(page.attributes('html')[0].get('lang'))

    def test_completion_and_error_pages_use_the_exposed_title_block(self):
        titles = {
            '404.html': 'Page not found',
            'error.html': 'Error',
            'remote_user/error.html': 'Error',
            'remote_user/create_unknown_user_false.html': 'Error',
            'remote_user/not_active.html': 'Account inactive',
            'shibboleth/complete.html': 'Registration complete',
            'subscription/pay_result.html': 'Payment result',
            'client_login_complete.html': 'Client login complete',
            'registration/activation_complete.html': 'Account activated',
            'registration/registration_complete.html': 'Registration complete',
            'registration/password_reset_complete.html': 'Successfully reset password',
            'registration/password_change_done.html': 'Password Changed Successfully',
        }
        engine = template_engine()
        for template, title in titles.items():
            with self.subTest(template=template):
                html = engine.get_template(template).render(page_context())
                self.assertEqual(MarkupParser(html).title,
                                 title + ' - Fixture Seafile')

    def test_untranslated_copy_is_preserved_and_english_documents_are_identified(self):
        fixtures = rendered_fixtures()
        self.assertIn('你的帐号已经激活。', fixtures['activation-complete'])
        self.assertIn('登录</a>', fixtures['activation-complete'])
        for name in ('500', 'shibboleth-success'):
            with self.subTest(name=name):
                self.assertEqual(MarkupParser(fixtures[name]).attributes('html')[0]['lang'],
                                 'en')
        base = MarkupParser(fixtures['two-factor-base'])
        notice = next(attrs for attrs in base.attributes('div')
                      if attrs.get('class') == 'alert alert-success')
        self.assertEqual(notice['lang'], 'en')

    @override_settings(USE_I18N=True)
    def test_standalone_localized_shells_use_the_active_language_without_context(self):
        engine = template_engine()
        for language in ('en', 'de', 'zh-hans'):
            with override(language):
                for template in ('trusted_ip/403_trusted_ip.html',
                                 'two_factor/_base.html', 'two_factor/_base_focus.html'):
                    with self.subTest(language=language, template=template):
                        page = MarkupParser(engine.get_template(template).render(
                            page_context(LANGUAGE_CODE='incorrect-context-language')))
                        self.assertEqual(page.attributes('html')[0]['lang'], language)

    def test_production_error_handlers_render_product_templates(self):
        from django.test import RequestFactory

        templates = [{
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': [str(SEAHUB_ROOT / 'templates')],
            'OPTIONS': {
                'libraries': {'seahub_tags': 'django.templatetags.static'},
                'context_processors': ['django.template.context_processors.i18n'],
            },
        }]
        request = RequestFactory().get('/fixture-missing-page/')
        with override_settings(DEBUG=False, TEMPLATES=templates):
            for handler, arguments, status in (
                    (page_not_found, (request, Exception('fixture')), 404),
                    (server_error, (request,), 500)):
                with self.subTest(status=status):
                    response = handler(*arguments)
                    self.assertEqual(response.status_code, status)
                    page = MarkupParser(response.content.decode())
                    self.assertTrue(page.title.strip())
                    self.assertEqual(len(page.attributes('main')), 1)
                    if status == 500:
                        self.assertEqual(page.attributes('html')[0]['lang'], 'en')
                        self.assertIn('Page unavailable', response.content.decode())


@override_settings(LANGUAGE_CODE='en')
class BillingHandoffTest(SimpleTestCase):
    def test_disabled_billing_does_not_create_a_token_or_handoff(self):
        response, namespace, decorators = billing_fixture(enabled=False)
        self.assertEqual(response.content, b'Billing is not enabled.')
        self.assertEqual(decorators, ['login_required', 'org_staff_required'])
        namespace['jwt'].encode.assert_not_called()
        namespace['render_to_string'].assert_not_called()
        namespace['Profile'].objects.get_profile_by_user.assert_not_called()

    def test_handoff_keeps_authorization_decorators_claims_and_automatic_post(self):
        profile = SimpleNamespace(contact_email='contact@seafile.invalid',
                                  nickname='Fixture display name')
        response, namespace, decorators = billing_fixture(profile=profile)
        self.assertEqual(decorators, ['login_required', 'org_staff_required'])
        namespace['jwt'].encode.assert_called_once_with({
            'iss': 'seafile.invalid',
            'aud': 'billing.invalid',
            'exp': 1700000300,
            'jti': 'fixture-identifier',
            'user_id': 'fixture-user@seafile.invalid',
            'email': 'contact@seafile.invalid',
            'name': 'Fixture display name',
            'org_id': 7,
            'org_name': 'Fixture organization',
        }, 'fixture-signing-key', algorithm='HS256')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/html')
        html = response.content.decode()
        page = MarkupParser(html)
        self.assertEqual(page.attributes('form'), [{
            'id': 'postForm', 'action': 'https://billing.invalid/auth/',
            'method': 'post',
        }])
        self.assertEqual(page.attributes('input'), [{
            'type': 'hidden', 'name': 'token', 'value': 'FIXTURE-ONLY-NOT-A-JWT',
        }])
        self.assertIn("document.getElementById('postForm').submit();", html)
        self.assertFalse(page.attributes('a'))
        self.assertFalse(page.attributes('button'))

    def test_missing_profile_keeps_existing_empty_claims(self):
        response, namespace, decorators = billing_fixture()
        claims = namespace['jwt'].encode.call_args.args[0]
        self.assertEqual(claims['email'], '')
        self.assertEqual(claims['name'], '')

    def test_token_and_auth_destination_are_escaped_only_inside_post_attributes(self):
        token = 'FIXTURE<&"token'
        auth_url = 'https://billing.invalid/auth/?fixture="<&'
        response, namespace, decorators = billing_fixture(token=token, auth_url=auth_url)
        html = response.content.decode()
        page = MarkupParser(html)
        self.assertEqual(page.attributes('form')[0]['action'], auth_url)
        self.assertEqual(page.attributes('input')[0]['value'], token)
        self.assertNotIn(token, html)
        self.assertNotIn(auth_url, html)
        self.assertFalse(page.attributes('a'))
