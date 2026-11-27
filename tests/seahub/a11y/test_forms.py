from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from django import forms
from django.forms.utils import ErrorDict
from django.template import Context, Engine, Library
from django.test import SimpleTestCase, override_settings
from django.urls import path
from django.views.generic import TemplateView
from formtools.wizard.forms import ManagementForm
from webpack_loader.templatetags import webpack_loader

from seahub.base.accounts import DetailedRegistrationForm, RegistrationForm
from seahub.two_factor.forms import (
    DeviceValidationForm,
    MethodForm,
    PhoneNumberForm,
    TOTPDeviceForm,
)


urlpatterns = [
    path(name + '/', TemplateView.as_view(), name=name)
    for name in ('i18n', 'captcha-refresh', 'options_save',
                 'ajax_get_link_email_audit_code')
]


def template_engine():
    seahub_root = Path(__file__).resolve().parents[3] / 'seahub'
    engine = Engine(
        dirs=[str(seahub_root / 'templates')] + [
            str(seahub_root / app / 'templates')
            for app in ('invitations', 'organizations', 'options',
                        'share', 'two_factor')
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
        'site_title': 'Seafile',
        'site_description': '',
        'branding_css': '',
        'SITE_ROOT': '/',
        'MEDIA_URL': '/media/',
        'LANGUAGE_CODE': 'en',
        'LANGUAGES': [('en', 'English')],
        'logo_path': 'img/seafile-logo.png',
        'logo_width': 160,
        'logo_height': 40,
        'strong_pwd_required': 1,
    }
    context.update(extra)
    return Context(context)


class FormMarkupParser(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def attrs_by_id(self, element_id):
        return next(attrs for tag, attrs in self.elements
                    if attrs.get('id') == element_id)

    def input_by_name(self, name):
        return next(attrs for tag, attrs in self.elements
                    if tag == 'input' and attrs.get('name') == name)


@override_settings(ROOT_URLCONF=__name__, USE_I18N=False, STORAGES={
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
})
class FormAccessibilityTemplateTest(SimpleTestCase):
    def setUp(self):
        self.engine = template_engine()

    def render(self, template_name, **context):
        return FormMarkupParser(self.engine.get_template(template_name).render(
            page_context(**context)))

    def test_invitation_email_has_an_associated_label(self):
        page = self.render('invitations/token_view.html',
                           iv=SimpleNamespace(accepter='invitee@example.com'))
        email = page.attrs_by_id('invitation-email')

        self.assertEqual(email['value'], 'invitee@example.com')
        self.assertIn('disabled', email)
        self.assertTrue(any(tag == 'label' and
                            attrs.get('for') == email['id']
                            for tag, attrs in page.elements))

    def test_two_factor_codes_have_persistent_labels_and_instructions(self):
        for step in ('token', 'backup'):
            for method in ('generator', 'call', 'sms'):
                with self.subTest(step=step, method=method):
                    page = self.render(
                        'two_factor/core/login.html',
                        wizard=SimpleNamespace(
                            steps=SimpleNamespace(current=step)),
                        device=SimpleNamespace(method=method), form_prefix='auth-')
                    token = page.attrs_by_id('token')

                    self.assertEqual(token['name'], 'auth-otp_token')
                    self.assertTrue(any(tag == 'label' and
                                        attrs.get('for') == token['id'] and
                                        attrs.get('class') == 'sr-only'
                                        for tag, attrs in page.elements))
                    self.assertIn('token-instructions',
                                  token['aria-describedby'].split())
                    page.attrs_by_id('token-instructions')
                    if step == 'token':
                        self.assertEqual(token['autocomplete'], 'one-time-code')
                    else:
                        self.assertEqual(token['autocomplete'], 'off')
                        self.assertNotIn('inputmode', token)
                        self.assertNotIn('pattern', token)

    def test_two_factor_errors_describe_only_an_invalid_code(self):
        for step in ('token', 'backup'):
            for errors in ({}, {'otp_token': ['Invalid token']}):
                with self.subTest(step=step, errors=bool(errors)):
                    page = self.render(
                        'two_factor/core/login.html',
                        wizard=SimpleNamespace(
                            steps=SimpleNamespace(current=step)),
                        form=SimpleNamespace(errors=errors))
                    token = page.attrs_by_id('token')
                    error = page.attrs_by_id('token-error')

                    self.assertEqual(error['role'], 'alert')
                    self.assertEqual(token.get('aria-invalid') == 'true',
                                     bool(errors))
                    self.assertEqual('token-error' in
                                     token['aria-describedby'].split(), bool(errors))

    def test_share_email_verification_fields_have_persistent_labels(self):
        page = self.render('share/share_link_email_audit.html')
        for name, purpose in (('email', 'email'), ('code', 'one-time-code')):
            with self.subTest(name=name):
                field = page.input_by_name(name)
                self.assertEqual(field['autocomplete'], purpose)
                self.assertTrue(any(tag == 'label' and
                                    attrs.get('for') == field['id'] and
                                    attrs.get('class') == 'sr-only'
                                    for tag, attrs in page.elements))
                self.assertEqual(field['type'], 'text')
                self.assertNotIn('pattern', field)

    def test_encrypted_library_radios_have_names_descriptions_and_group(self):
        page = self.render('options/set_user_options.html')
        group_tag, group = next((tag, attrs) for tag, attrs in page.elements
                                if attrs.get('role') == 'radiogroup')
        self.assertEqual(group_tag, 'div')
        self.assertEqual(group['aria-labelledby'], 'encryption-options-title')
        page.attrs_by_id(group['aria-labelledby'])
        page.attrs_by_id(group['aria-describedby'])
        radios = [attrs for tag, attrs in page.elements
                  if tag == 'input' and attrs.get('type') == 'radio']
        self.assertEqual(len(radios), 2)
        for radio in radios:
            self.assertEqual(radio['name'], 'repo-enc')
            page.attrs_by_id(radio['aria-labelledby'])
            page.attrs_by_id(radio['aria-describedby'])

    def test_password_helper_uses_one_meaningful_indicator(self):
        script = self.engine.get_template(
            'snippets/password_strength_js.html').render(page_context())
        page = FormMarkupParser(script.split('var template = `', 1)[1].split('`;', 1)[0])
        region = next(attrs for tag, attrs in page.elements
                      if attrs.get('role') == 'region')
        self.assertEqual(region['aria-label'], 'Password strength')
        indicators = [attrs for tag, attrs in page.elements
                      if attrs.get('role') == 'progressbar']
        self.assertEqual(len(indicators), 1)
        self.assertEqual(indicators[0]['aria-label'], 'Password strength')
        self.assertEqual(indicators[0]['aria-valuemin'], '0')
        self.assertEqual(indicators[0]['aria-valuemax'], '4')
        bars = [attrs for tag, attrs in page.elements
                if attrs.get('class') == 'progress-bar']
        self.assertEqual(len(bars), 4)
        self.assertTrue(all(bar.get('aria-hidden') == 'true' for bar in bars))

    def test_all_password_pages_still_include_the_shared_helper(self):
        class SignupForm(forms.Form):
            email = forms.EmailField()
            password1 = forms.CharField(widget=forms.PasswordInput)
            password2 = forms.CharField(widget=forms.PasswordInput)

        for template_name, field_id in (
            ('registration/registration_form.html', 'id_password1'),
            ('registration/password_set_form.html', 'id_new_password1'),
            ('registration/password_change_form.html', 'id_new_password1'),
            ('registration/password_reset_confirm.html', 'id_new_password1'),
            ('invitations/token_view.html', 'password'),
            ('organizations/org_register.html', 'password1'),
        ):
            with self.subTest(template_name=template_name):
                html = self.engine.get_template(template_name).render(
                    page_context(form=SignupForm(), validlink=True))
                self.assertIn('function setupPasswordField(', html)
                self.assertIn('setupPasswordField("' + field_id + '"', html)
                FormMarkupParser(html).attrs_by_id(field_id)


urlpatterns += [
    path('share/<str:token>/', TemplateView.as_view(), name='view_shared_file'),
    path('repo/<str:repo_id>/password/', TemplateView.as_view(),
         name='api-v2.1-repo-set-password'),
]


class ValidationForm(forms.Form):
    email = forms.CharField(widget=forms.TextInput(attrs={'class': 'input'}))
    password1 = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'input'}))
    password2 = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'input'}))
    old_password = forms.CharField(widget=forms.PasswordInput)
    new_password1 = forms.CharField(widget=forms.PasswordInput)
    new_password2 = forms.CharField(widget=forms.PasswordInput)
    contact_email = forms.EmailField()
    org_name = forms.CharField()
    url_prefix = forms.CharField()
    name = forms.CharField(widget=forms.TextInput(attrs={'class': 'input'}))
    department = forms.CharField(widget=forms.TextInput(attrs={'class': 'input'}))
    telephone = forms.CharField(widget=forms.TextInput(attrs={'class': 'input'}))
    note = forms.CharField(widget=forms.TextInput(attrs={'class': 'input'}))


def validation_context(**extra):
    context = {
        'form': ValidationForm(),
        'validlink': True,
        'iv': SimpleNamespace(accepter='invitee@example.com'),
        'repo': SimpleNamespace(id='fixture-library', name='Fixture library'),
        'view_name': 'view_shared_file',
        'token': 'fixture-token',
    }
    context.update(extra)
    return page_context(**context)


def invalid_form(*field_names):
    form = ValidationForm(data={
        name: 'fixture@example.com' if 'email' in name else 'Fixture1234!'
        for name in ValidationForm.base_fields
    })
    for field_name in field_names:
        form.add_error(field_name, 'Existing validation message')
    return form


@override_settings(ROOT_URLCONF=__name__, USE_I18N=False, STORAGES={
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
})
class FormValidationTemplateTest(SimpleTestCase):
    def setUp(self):
        self.engine = template_engine()

    def render(self, template_name, **context):
        return FormMarkupParser(self.engine.get_template(template_name).render(
            validation_context(**context)))

    def test_handwritten_fields_reference_the_existing_django_errors(self):
        for template_name, names in (
            ('registration/password_change_form.html',
             ('old_password', 'new_password1', 'new_password2')),
            ('registration/password_set_form.html',
             ('contact_email', 'new_password1', 'new_password2')),
            ('registration/password_reset_confirm.html',
             ('new_password1', 'new_password2')),
            ('registration/password_reset_form.html', ('email',)),
            ('organizations/org_register.html',
             ('org_name', 'url_prefix', 'name', 'email')),
        ):
            for name in names:
                with self.subTest(template_name=template_name, name=name):
                    page = self.render(template_name, form=invalid_form(name))
                    field = page.input_by_name(name)
                    error_id = 'id_' + name + '_error'
                    self.assertEqual(field.get('aria-invalid'), 'true')
                    self.assertIn(error_id, field['aria-describedby'].split())
                    page.attrs_by_id(error_id)
                    unrelated = [attrs for tag, attrs in page.elements
                                 if tag == 'input' and attrs.get('name') != name]
                    self.assertTrue(all(attrs.get('aria-invalid') != 'true'
                                        for attrs in unrelated))

    def test_django_signup_widgets_keep_their_generated_error_associations(self):
        names = ('email', 'password1', 'password2', 'name',
                 'department', 'telephone', 'note')
        for name in names:
            with self.subTest(name=name):
                page = self.render('registration/registration_form.html',
                                   form=invalid_form(name))
                field = page.input_by_name(name)
                self.assertEqual(field['aria-invalid'], 'true')
                error_id = 'id_' + name + '_error'
                self.assertIn(error_id, field['aria-describedby'].split())
                page.attrs_by_id(error_id)

    def test_unbound_fields_are_not_marked_invalid(self):
        for template_name in (
            'registration/password_change_form.html',
            'registration/password_set_form.html',
            'registration/password_reset_confirm.html',
            'registration/password_reset_form.html',
            'registration/registration_form.html',
            'organizations/org_register.html',
            'share_access_validation.html',
        ):
            with self.subTest(template_name=template_name):
                page = self.render(template_name)
                self.assertTrue(all(attrs.get('aria-invalid') != 'true'
                                    for tag, attrs in page.elements if tag == 'input'))

    def test_share_password_server_error_is_associated_with_the_password(self):
        page = self.render('share_access_validation.html',
                           err_msg='Please enter a correct password.')
        field = page.input_by_name('password')
        self.assertEqual(field['aria-invalid'], 'true')
        self.assertIn('share-password-error', field['aria-describedby'].split())
        self.assertEqual(page.attrs_by_id('share-password-error')['role'], 'alert')

    def test_generic_login_errors_do_not_blame_either_credential(self):
        for error_name in ('freeze_account', 'inactive', 'invalid_input',
                           'not_found', 'disable_pwd_login', '__all__'):
            with self.subTest(error_name=error_name):
                page = self.render('registration/login.html', form=SimpleNamespace(
                    errors={error_name: 'Existing server error'}))
                error = page.attrs_by_id('login-error')
                self.assertIn('data-server-error', error)
                self.assertEqual(error['role'], 'alert')
                for name in ('login', 'password'):
                    self.assertNotIn('aria-invalid', page.input_by_name(name))

    def test_every_participating_form_opts_into_the_shared_helper(self):
        for template_name, form_id in (
            ('registration/login.html', 'login-form'),
            ('registration/registration_form.html', 'signup-form'),
            ('organizations/org_register.html', 'signup-form'),
            ('registration/password_change_form.html', 'password-change-form'),
            ('registration/password_set_form.html', 'password-set-form'),
            ('registration/password_reset_confirm.html', 'password-reset-form'),
            ('registration/password_reset_form.html', 'login-form'),
            ('invitations/token_view.html', 'invitation-form'),
            ('share_access_validation.html', 'share-passwd-form'),
            ('decrypt_repo_form.html', 'repo-decrypt-form'),
        ):
            with self.subTest(template_name=template_name):
                html = self.engine.get_template(template_name).render(validation_context())
                page = FormMarkupParser(html)
                page.attrs_by_id(form_id)
                self.assertIn('formValidation.setup(', html)
                if template_name != 'registration/password_reset_form.html':
                    self.assertTrue(any('data-form-error' in attrs
                                        for tag, attrs in page.elements))

    def test_captcha_errors_keep_their_existing_markup(self):
        class ChallengeForm(forms.Form):
            captcha = forms.CharField()

        page = self.render('registration/login.html', form=ChallengeForm(data={}))
        page.attrs_by_id('id_captcha_error')
        self.assertFalse(any('data-form-error' in attrs
                             for tag, attrs in page.elements))

    def test_shared_helper_is_defined_but_forms_are_opt_in(self):
        html = self.engine.get_template('base.html').render(validation_context())
        self.assertIn('var formValidation =', html)
        self.assertNotIn('formValidation.setup(', html)


@override_settings(
    ROOT_URLCONF='tests.seahub.a11y.test_forms',
    USE_I18N=False,
    STORAGES={'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    }},
)
class InputPurposeTemplateTest(SimpleTestCase):
    def setUp(self):
        self.engine = template_engine()

    def render(self, template_name, **context):
        return FormMarkupParser(self.engine.get_template(template_name).render(
            validation_context(**context)))

    def test_login_and_sso_identify_the_account_username(self):
        for template_name in ('registration/login.html',
                              'registration/multi_adfs_sso.html'):
            with self.subTest(template_name=template_name):
                field = self.render(template_name).input_by_name('login')
                self.assertEqual(field['autocomplete'], 'username')
                self.assertEqual(field['type'], 'text')

    def test_existing_passwords_are_distinct_from_new_passwords(self):
        for template_name, name in (
            ('registration/login.html', 'password'),
            ('sysadmin/sudo_mode.html', 'password'),
            ('registration/password_change_form.html', 'old_password'),
        ):
            with self.subTest(template_name=template_name):
                field = self.render(template_name).input_by_name(name)
                self.assertEqual(field['autocomplete'], 'current-password')
                self.assertEqual(field['type'], 'password')

        for template_name, names in (
            ('registration/password_change_form.html',
             ('new_password1', 'new_password2')),
            ('registration/password_set_form.html',
             ('new_password1', 'new_password2')),
            ('registration/password_reset_confirm.html',
             ('new_password1', 'new_password2')),
            ('invitations/token_view.html', ('password', 'password2')),
            ('organizations/org_register.html', ('password1', 'password2')),
        ):
            for name in names:
                with self.subTest(template_name=template_name, name=name):
                    field = self.render(template_name).input_by_name(name)
                    self.assertEqual(field['autocomplete'], 'new-password')
                    self.assertEqual(field['type'], 'password')

    def test_personal_fields_declare_their_existing_purpose(self):
        for template_name, expected in (
            ('registration/password_set_form.html', {'contact_email': 'email'}),
            ('registration/password_reset_form.html', {'email': 'email'}),
            ('organizations/org_register.html', {
                'org_name': 'organization', 'name': 'name', 'email': 'email',
            }),
        ):
            page = self.render(template_name)
            for name, purpose in expected.items():
                with self.subTest(template_name=template_name, name=name):
                    self.assertEqual(page.input_by_name(name)['autocomplete'],
                                     purpose)
        page = self.render('organizations/org_register.html')
        self.assertNotIn('autocomplete', page.input_by_name('url_prefix'))

    def test_generated_signup_widgets_identify_their_purpose(self):
        for form_class in (RegistrationForm, DetailedRegistrationForm):
            form = form_class()
            for name, purpose in (
                ('email', 'email'), ('password1', 'new-password'),
                ('password2', 'new-password'),
            ):
                with self.subTest(form_class=form_class.__name__, name=name):
                    field = FormMarkupParser(str(form[name])).input_by_name(name)
                    self.assertEqual(field['autocomplete'], purpose)
                    self.assertEqual(field['class'], 'input')
            page = self.render('registration/registration_form.html', form=form)
            self.assertEqual(page.input_by_name('email')['autocomplete'], 'email')
            self.assertEqual(page.input_by_name('password1')['autocomplete'],
                             'new-password')
            for name in ('password1', 'password2'):
                self.assertIsInstance(form.fields[name].widget, forms.PasswordInput)
                self.assertFalse(form.fields[name].widget.render_value)

    def test_detailed_signup_uses_only_applicable_personal_data_tokens(self):
        form = DetailedRegistrationForm()
        for name, purpose in (('name', 'name'), ('telephone', 'tel')):
            with self.subTest(name=name):
                field = FormMarkupParser(str(form[name])).input_by_name(name)
                self.assertEqual(field['autocomplete'], purpose)
                self.assertEqual(field['type'], 'text')
                form.fields[name].required = False
                optional = FormMarkupParser(str(form[name])).input_by_name(name)
                self.assertEqual(optional['autocomplete'], purpose)
                self.assertNotIn('required', optional)
        for name in ('userid', 'department', 'note'):
            with self.subTest(name=name):
                field = FormMarkupParser(str(form[name])).input_by_name(name)
                self.assertNotIn('autocomplete', field)

    def test_field_error_relationships_survive_purpose_metadata(self):
        for template_name, name in (
            ('registration/password_change_form.html', 'old_password'),
            ('registration/password_set_form.html', 'contact_email'),
            ('registration/password_reset_confirm.html', 'new_password2'),
            ('registration/password_reset_form.html', 'email'),
            ('organizations/org_register.html', 'org_name'),
        ):
            with self.subTest(template_name=template_name, name=name):
                page = self.render(template_name, form=invalid_form(name))
                field = page.input_by_name(name)
                self.assertIn('autocomplete', field)
                self.assertEqual(field['aria-invalid'], 'true')
                error_id = 'id_' + name + '_error'
                self.assertIn(error_id, field['aria-describedby'].split())
                page.attrs_by_id(error_id)

    def test_non_account_secrets_and_backup_codes_are_not_reclassified(self):
        for template_name in ('share_access_validation.html',
                              'decrypt_repo_form.html'):
            with self.subTest(template_name=template_name):
                field = self.render(template_name).input_by_name('password')
                self.assertNotIn('autocomplete', field)
                self.assertEqual(field['type'], 'password')
        html = self.engine.get_template('two_factor/core/login.html').render(
            validation_context(wizard={'steps': {'current': 'backup'}}))
        field = FormMarkupParser(html).attrs_by_id('token')
        self.assertEqual(field['autocomplete'], 'off')
        self.assertEqual(field['type'], 'text')
        self.assertNotIn('pattern', field)
        self.assertNotIn('inputmode', field)


def setup_form(step, error=None):
    if step == 'method':
        with patch('seahub.two_factor.forms.get_available_methods', return_value=[
            ('generator', 'Token generator'), ('sms', 'Text message'),
            ('call', 'Phone call'),
        ]):
            form = MethodForm(prefix=step)
    elif step == 'generator':
        form = TOTPDeviceForm(key='00' * 20,
                              user=SimpleNamespace(username='fixture-user'),
                              prefix=step)
    elif step in ('sms', 'call'):
        form = PhoneNumberForm(prefix=step)
    elif step == 'validation':
        form = DeviceValidationForm(device=SimpleNamespace(), prefix=step)
    else:
        form = forms.Form(prefix=step)
        if step == 'yubikey':
            form.fields['token'] = forms.CharField(label='Token')
    if error:
        form.is_bound = True
        form._errors = ErrorDict()
        form.cleaned_data = {}
        name = next(iter(form.fields))
        form.data = {form.add_prefix(name): '123456'}
        form.add_error(None if error == 'nonfield' else name,
                       'Existing server error')
    return form


def setup_context(step='generator', form=None, method='sms', **extra):
    context = {
        'wizard': SimpleNamespace(
            steps=SimpleNamespace(current=step),
            form=form if form is not None else setup_form(step),
            management_form=ManagementForm(
                prefix='setup_view', initial={'current_step': step}),
        ),
        'QR_URL': '/fixture-qr.svg',
        'QR_KEY': 'FIXTURE-ONLY-NOT-A-REAL-KEY',
        'cancel_url': '/fixture-profile/',
        'device': SimpleNamespace(method=method),
        'challenge_succeeded': True,
    }
    context.update(extra)
    return page_context(**context)


def setup_template_engine():
    engine = template_engine()
    engine.template_libraries['webpack_loader'] = webpack_loader.register
    return engine


@override_settings(
    ROOT_URLCONF='tests.seahub.a11y.test_forms',
    USE_I18N=False,
    STORAGES={'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    }},
)
class TwoFactorSetupTemplateTest(SimpleTestCase):
    def setUp(self):
        self.engine = setup_template_engine()
        bundle_patch = patch('webpack_loader.utils.get_as_tags', return_value=[])
        bundle_patch.start()
        self.addCleanup(bundle_patch.stop)

    def render(self, step='generator', **context):
        html = self.engine.get_template('two_factor/core/setup.html').render(
            setup_context(step, **context))
        return FormMarkupParser(html)

    def test_each_existing_setup_branch_has_named_form_and_instructions(self):
        for step in ('welcome', 'method', 'generator', 'sms', 'call',
                     'validation', 'yubikey'):
            with self.subTest(step=step):
                page = self.render(step)
                form = page.attrs_by_id('two-factor-setup-form')
                page.attrs_by_id(form['aria-labelledby'])
                page.attrs_by_id('two-factor-setup-instructions')
                self.assertEqual(form['method'], 'post')
                management = page.input_by_name('setup_view-current_step')
                self.assertEqual(management['type'], 'hidden')
                self.assertEqual(management['value'], step)

    def test_challenge_instructions_keep_the_existing_warning(self):
        for method in ('sms', 'call'):
            for succeeded in (True, False):
                with self.subTest(method=method, succeeded=succeeded):
                    page = self.render('validation', method=method,
                                       challenge_succeeded=succeeded)
                    instructions = page.attrs_by_id('two-factor-setup-instructions')
                    self.assertEqual(instructions.get('role') == 'alert',
                                     not succeeded)

    def test_generated_widgets_keep_labels_prefixes_and_field_errors(self):
        for step in ('generator', 'sms', 'call', 'validation', 'method'):
            with self.subTest(step=step):
                form = setup_form(step, error='field')
                page = self.render(step, form=form)
                name = next(iter(form.fields))
                fields = [attrs for tag, attrs in page.elements
                          if tag == 'input' and attrs.get('name') == step + '-' + name]
                self.assertTrue(fields)
                for field in fields:
                    self.assertEqual(field['aria-invalid'], 'true')
                    error_id = 'id_' + step + '-' + name + '_error'
                    described = field
                    if step == 'method':
                        described = next(attrs for tag, attrs in page.elements
                                         if tag == 'fieldset')
                    self.assertIn(error_id, described['aria-describedby'].split())
                    page.attrs_by_id(error_id)
                    self.assertTrue(any(tag == 'label' and
                                        attrs.get('for') == field['id']
                                        for tag, attrs in page.elements))

    def test_setup_widget_metadata_does_not_change_validation_or_input_type(self):
        for step, name, purpose, input_type in (
            ('generator', 'token', 'one-time-code', 'number'),
            ('validation', 'token', 'one-time-code', 'number'),
            ('sms', 'number', 'tel', 'text'),
            ('call', 'number', 'tel', 'text'),
        ):
            with self.subTest(step=step):
                page = self.render(step)
                field = page.input_by_name(step + '-' + name)
                self.assertEqual(field['autocomplete'], purpose)
                self.assertEqual(field['type'], input_type)
                self.assertIn('required', field)
                self.assertNotIn('pattern', field)
                self.assertNotIn('inputmode', field)
                if name == 'token':
                    self.assertEqual(field['min'], '0' if step == 'generator' else '1')

    def test_nonfield_errors_keep_the_existing_summary_without_blaming_fields(self):
        for step in ('method', 'generator', 'sms', 'call', 'validation'):
            with self.subTest(step=step):
                page = self.render(step, form=setup_form(step, error='nonfield'))
                self.assertTrue(any(tag == 'ul' and
                                    'nonfield' in attrs.get('class', '').split()
                                    for tag, attrs in page.elements))
                self.assertFalse(any(tag == 'input' and
                                     attrs.get('aria-invalid') == 'true'
                                     for tag, attrs in page.elements))
                self.assertFalse(any('data-form-error' in attrs
                                     for tag, attrs in page.elements))

    def test_shared_widgets_have_no_setup_only_description_references(self):
        for step in ('sms', 'call', 'generator', 'validation'):
            with self.subTest(step=step):
                page = FormMarkupParser(str(setup_form(step)))
                for tag, attrs in page.elements:
                    if tag == 'input':
                        self.assertNotIn('two-factor-setup-instructions',
                                         attrs.get('aria-describedby', '').split())

    def test_method_choices_and_secret_key_alternative_are_retained(self):
        page = self.render('method')
        radios = [attrs for tag, attrs in page.elements
                  if tag == 'input' and attrs.get('type') == 'radio']
        self.assertEqual([field['value'] for field in radios],
                         ['generator', 'sms', 'call'])
        page = self.render('generator')
        button = page.attrs_by_id('qr-code-secret-key')
        self.assertEqual(button['type'], 'button')
        self.assertEqual(button['aria-label'], 'Copy Secret Key')
        self.assertEqual(button['data-secret-key'], 'FIXTURE-ONLY-NOT-A-REAL-KEY')
