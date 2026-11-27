import ast
import importlib.util
import unittest
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from captcha.conf import settings as captcha_settings
from captcha.fields import CaptchaField
from captcha.models import CaptchaStore
from django import forms
from django.template import Context, Engine, Library
from django.test import SimpleTestCase, override_settings
from django.urls import path
from django.views.generic import TemplateView


ROOT = Path(__file__).resolve().parents[3]
PROVIDER_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
PROVIDER_ERROR = ('Cloudflare Turnstile check failed. '
                  'Please refresh and try again.')
urlpatterns = [
    path('i18n/', TemplateView.as_view(), name='i18n'),
    path('fixture-captcha/refresh/', TemplateView.as_view(),
         name='captcha-refresh'),
    path('fixture-captcha/image/<str:key>/', TemplateView.as_view(),
         name='captcha-image'),
    path('fixture-captcha/audio/<str:key>/', TemplateView.as_view(),
         name='captcha-audio'),
]


class LoginChallengeForm(forms.Form):
    captcha = CaptchaField()


class SignupFixtureForm(forms.Form):
    email = forms.EmailField(widget=forms.EmailInput(attrs={'class': 'input'}))
    password1 = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'input'}))
    password2 = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'input'}))


class Markup(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def by_id(self, identifier):
        return next(attrs for tag, attrs in self.elements
                    if attrs.get('id') == identifier)


def template_engine():
    engine = Engine(
        dirs=[str(ROOT / 'seahub/templates'),
              str(ROOT / 'seahub/organizations/templates')],
        libraries={'i18n': 'django.templatetags.i18n',
                   'static': 'django.templatetags.static'},
    )
    engine.template_libraries['seahub_tags'] = Library()
    return engine


def render_fixture(template_name, challenge=False, audio=False,
                   captcha_error=False, captcha_help=False, account_error=False,
                   provider=False, provider_error=False):
    if challenge:
        form = LoginChallengeForm(data={} if captcha_error else None)
    else:
        form = SignupFixtureForm()
    if captcha_error:
        form.add_error('captcha', 'Invalid CAPTCHA')
    if captcha_help:
        form.fields['captcha'].widget.attrs['aria-describedby'] = 'fixture-captcha-help'
    if account_error:
        form.cleaned_data = {}
        form.add_error(None, 'Synthetic account error')
    if provider_error:
        form.cleaned_data = {}
        form.add_error(None, PROVIDER_ERROR)
    context = Context({
        'request': SimpleNamespace(user=SimpleNamespace(is_authenticated=False),
                                   session={}),
        'form': form,
        'site_title': 'Offline challenge fixture',
        'SITE_ROOT': '/',
        'MEDIA_URL': '/media/',
        'LANGUAGE_CODE': 'en',
        'LANGUAGES': [('en', 'English')],
        'logo_path': 'img/seafile-logo.png',
        'logo_width': 160,
        'logo_height': 40,
        'strong_pwd_required': 1,
        'remember_days': 7,
        'enable_turnstile': provider,
        'turnstile_site_key': 'fixture-placeholder-not-a-provider-key',
    })
    with patch.object(CaptchaStore, 'generate_key', return_value='fixture-key'), \
            patch.object(CaptchaStore, 'pick', return_value='fixture-key'), \
            patch.object(captcha_settings, 'CAPTCHA_FLITE_PATH',
                         '/fixture/audio-not-executed' if audio else None):
        html = template_engine().get_template(template_name).render(context)
    if captcha_help:
        html = html.replace('</form>', '<span id="fixture-captcha-help" '
                            'class="sr-only">Synthetic CAPTCHA help</span></form>', 1)
    return html


def rendered_fixtures():
    fixtures = {
        'login-plain': render_fixture('registration/login.html'),
        'login-captcha': render_fixture('registration/login.html', challenge=True),
        'login-captcha-error': render_fixture('registration/login.html',
                                             challenge=True, captcha_error=True),
        'login-captcha-audio': render_fixture('registration/login.html',
                                             challenge=True, audio=True),
        'login-captcha-help-error': render_fixture('registration/login.html',
                                                  challenge=True, captcha_error=True,
                                                  captcha_help=True),
        'login-captcha-account-error': render_fixture('registration/login.html',
                                                     challenge=True, account_error=True),
    }
    for name, template in (
        ('signup', 'registration/registration_form.html'),
        ('reset', 'registration/password_reset_form.html'),
    ):
        fixtures[name + '-plain'] = render_fixture(template)
        fixtures[name + '-turnstile'] = render_fixture(template, provider=True)
        fixtures[name + '-turnstile-error'] = render_fixture(
            template, provider=True, provider_error=True)
    return fixtures


@override_settings(ROOT_URLCONF='tests.seahub.a11y.test_challenges',
                   USE_I18N=False)
class ChallengeTemplateTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.fixtures = rendered_fixtures()

    def test_login_challenge_branch_matches_the_authentication_form_field(self):
        source = (ROOT / 'seahub/auth/forms.py').read_text()
        self.assertIn('class CaptchaAuthenticationForm(AuthenticationForm):\n'
                      '    captcha = CaptchaField()', source)
        self.assertFalse(any(attrs.get('id') == 'id_captcha_1' for tag, attrs in
                             Markup(self.fixtures['login-plain']).elements))
        page = Markup(self.fixtures['login-captcha'])
        self.assertEqual(page.by_id('id_captcha_0')['value'], 'fixture-key')
        answer = page.by_id('id_captcha_1')
        self.assertEqual(answer['type'], 'text')
        self.assertEqual(answer['autocomplete'], 'off')
        self.assertNotIn('onpaste', answer)

    def test_refresh_has_a_native_keyboard_button_and_existing_name(self):
        refresh = Markup(self.fixtures['login-captcha']).by_id('refresh-captcha')
        self.assertEqual(refresh['type'], 'button')
        self.assertEqual(refresh['aria-label'], 'Refresh')
        self.assertEqual(refresh['title'], 'Refresh')
        self.assertNotIn('tabindex', refresh)

    def test_real_widget_renders_image_and_optional_audio_link(self):
        for name, expected in (('login-captcha', False),
                               ('login-captcha-audio', True)):
            with self.subTest(name=name):
                elements = Markup(self.fixtures[name]).elements
                image = next(attrs for tag, attrs in elements
                             if tag == 'img' and attrs.get('class') == 'captcha')
                self.assertEqual(image['alt'], 'captcha')
                self.assertEqual(image['src'], '/fixture-captcha/image/fixture-key/')
                audio = [attrs for tag, attrs in elements if tag == 'a' and
                         attrs.get('href') == '/fixture-captcha/audio/fixture-key/']
                self.assertEqual(bool(audio), expected)
                if audio:
                    self.assertEqual(audio[0]['title'], 'Play CAPTCHA as audio file')

    def test_invalid_captcha_retains_error_markup_and_invalid_state(self):
        page = Markup(self.fixtures['login-captcha-error'])
        answer = page.by_id('id_captcha_1')
        self.assertEqual(answer['aria-invalid'], 'true')
        page.by_id('id_captcha_error')
        self.assertIn('Invalid CAPTCHA', self.fixtures['login-captcha-error'])
        self.assertFalse(any('data-form-error' in attrs
                             for tag, attrs in page.elements))

    def test_provider_markup_is_conditional_and_errors_remain_nonfield(self):
        for name in ('signup', 'reset'):
            with self.subTest(name=name):
                self.assertNotIn(PROVIDER_SCRIPT, self.fixtures[name + '-plain'])
                html = self.fixtures[name + '-turnstile-error']
                page = Markup(html)
                scripts = [attrs for tag, attrs in page.elements
                           if tag == 'script' and attrs.get('src') == PROVIDER_SCRIPT]
                self.assertEqual(len(scripts), 1)
                self.assertIn('async', scripts[0])
                self.assertIn('defer', scripts[0])
                widgets = [attrs for tag, attrs in page.elements
                           if 'cf-turnstile' in attrs.get('class', '').split()]
                self.assertEqual(len(widgets), 1)
                self.assertEqual(widgets[0]['data-sitekey'],
                                 'fixture-placeholder-not-a-provider-key')
                self.assertIn(PROVIDER_ERROR, html)
                self.assertTrue(any('nonfield' in attrs.get('class', '').split()
                                    for tag, attrs in page.elements))
                self.assertFalse(any(tag == 'input' and
                                     attrs.get('aria-invalid') == 'true'
                                     for tag, attrs in page.elements))

    def test_signup_and_reset_views_keep_provider_failures_nonfield(self):
        for filename in ('thirdpart/registration/views.py',
                         'seahub/auth/views.py',
                         'seahub/organizations/views.py'):
            with self.subTest(filename=filename):
                module = ast.parse((ROOT / filename).read_text())
                guards = [node for node in ast.walk(module)
                          if isinstance(node, ast.If) and
                          'check_turnstile(request)' in ast.unparse(node.test)]
                self.assertEqual(len(guards), 1)
                expected = ast.parse('enable_turnstile and not check_turnstile(request)',
                                     mode='eval').body
                self.assertEqual(ast.dump(guards[0].test), ast.dump(expected))
                errors = [node for node in ast.walk(guards[0])
                          if isinstance(node, ast.Call) and
                          isinstance(node.func, ast.Attribute) and
                          node.func.attr == 'add_error']
                self.assertEqual(len(errors), 1)
                self.assertIsNone(errors[0].args[0].value)
                self.assertEqual(errors[0].args[1].args[0].value, PROVIDER_ERROR)

    def test_captcha_answer_has_a_programmatic_name(self):
        page = Markup(self.fixtures['login-captcha'])
        answer = page.by_id('id_captcha_1')
        labels = [attrs for tag, attrs in page.elements
                  if tag == 'label' and attrs.get('for') == 'id_captcha_1']
        self.assertTrue(labels or answer.get('aria-label') or
                        answer.get('aria-labelledby'))

    def test_refresh_failure_has_its_own_alert_target_in_every_captcha_branch(self):
        for name, html in self.fixtures.items():
            if not name.startswith('login-captcha'):
                continue
            with self.subTest(name=name):
                alert = Markup(html).by_id('captcha-refresh-error')
                self.assertEqual(alert['role'], 'alert')
                self.assertEqual(alert['aria-atomic'], 'true')
                self.assertIn('hide', alert['class'].split())
                self.assertNotIn('data-form-error', alert)

    def test_refresh_success_has_a_nonvisual_polite_atomic_status_region(self):
        page = Markup(self.fixtures['login-captcha'])
        status = page.by_id('captcha-status')
        self.assertEqual(status['role'], 'status')
        self.assertEqual(status['aria-live'], 'polite')
        self.assertEqual(status['aria-atomic'], 'true')
        self.assertEqual(status['class'], 'sr-only')

    def test_plain_login_has_no_challenge_regions(self):
        page = Markup(self.fixtures['login-plain'])
        self.assertFalse(any(attrs.get('id') in ('captcha-status', 'captcha-refresh-error')
                             for tag, attrs in page.elements))

    @unittest.expectedFailure
    def test_gap_signup_exposes_expiry_and_error_callbacks(self):
        widget = next(attrs for tag, attrs in
                      Markup(self.fixtures['signup-turnstile']).elements
                      if 'cf-turnstile' in attrs.get('class', '').split())
        self.assertTrue(widget.get('data-expired-callback') and
                        widget.get('data-error-callback'))

    @unittest.expectedFailure
    def test_gap_reset_exposes_expiry_and_error_callbacks(self):
        widget = next(attrs for tag, attrs in
                      Markup(self.fixtures['reset-turnstile']).elements
                      if 'cf-turnstile' in attrs.get('class', '').split())
        self.assertTrue(widget.get('data-expired-callback') and
                        widget.get('data-error-callback'))


class TurnstileBoundaryTests(unittest.TestCase):
    def setUp(self):
        specification = importlib.util.spec_from_file_location(
            'offline_turnstile_under_test', ROOT / 'seahub/utils/turnstile.py')
        self.module = importlib.util.module_from_spec(specification)
        specification.loader.exec_module(self.module)
        self.module.logger = Mock()
        self.module.settings = SimpleNamespace(
            ENABLE_TURNSTILE=True,
            TURNSTILE_SECRET_KEY='fixture-secret-not-valid',
            TURNSTILE_SITEVERIFY_URL='https://provider.invalid/siteverify',
        )
        self.requests = SimpleNamespace(post=Mock())
        self.requests.post.return_value.json.return_value = {'success': True}
        self.client_ip = SimpleNamespace(get_client_ip=lambda request: '192.0.2.10')
        self.boundaries = patch.dict('sys.modules', {
            'requests': self.requests,
            'seahub.api2.utils': self.client_ip,
        })
        self.boundaries.start()
        self.addCleanup(self.boundaries.stop)

    def request(self, token='fixture-token-not-valid', api=False):
        if api:
            return SimpleNamespace(data={'cf_turnstile_response': token})
        return SimpleNamespace(POST={'cf-turnstile-response': token})

    def test_disabled_provider_does_not_call_network_boundary(self):
        self.module.settings.ENABLE_TURNSTILE = False
        self.assertTrue(self.module.check_turnstile(SimpleNamespace()))
        self.requests.post.assert_not_called()

    def test_missing_response_and_secret_fail_without_network(self):
        self.assertFalse(self.module.check_turnstile(self.request(token='')))
        self.module.settings.TURNSTILE_SECRET_KEY = ''
        self.assertFalse(self.module.check_turnstile(self.request()))
        self.requests.post.assert_not_called()

    def test_both_response_spellings_reach_only_the_mock(self):
        for api in (False, True):
            with self.subTest(api=api):
                self.assertTrue(self.module.check_turnstile(self.request(api=api)))
                self.requests.post.assert_called_with(
                    'https://provider.invalid/siteverify', timeout=10,
                    data={'secret': 'fixture-secret-not-valid',
                          'response': 'fixture-token-not-valid',
                          'remoteip': '192.0.2.10'})

    def test_expired_error_and_unavailable_provider_all_fail_closed(self):
        for response in ({'success': False, 'error-codes': ['timeout-or-duplicate']},
                         {'success': False, 'error-codes': ['internal-error']}, {}):
            with self.subTest(response=response):
                self.requests.post.return_value.json.return_value = response
                self.assertFalse(self.module.check_turnstile(self.request()))
        self.requests.post.side_effect = TimeoutError('Synthetic timeout')
        self.assertFalse(self.module.check_turnstile(self.request()))

    def test_malformed_provider_response_fails_closed(self):
        self.requests.post.return_value.json.side_effect = ValueError('Synthetic JSON error')
        self.assertFalse(self.module.check_turnstile(self.request()))
