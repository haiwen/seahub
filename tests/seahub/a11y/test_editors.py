import json
import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace

from django.conf import settings
from django.template import Context, Engine, Library
from django.test import SimpleTestCase, override_settings
from django.urls import path
from django.utils import translation


TEMPLATES = (
    'view_file_wopi.html',
    'view_file_thirdparty_editor.html',
    'view_file_onlyoffice.html',
)
FILENAME = 'Résumé "budget" & <script>fixture</script>.docx'
urlpatterns = [
    path('fixture/history/<str:repo_id>/', lambda request: None,
         name='api-v2.1-new-file-history-view'),
    path('fixture/history-token/', lambda request: None,
         name='onlyoffice_api_get_history_file_access_token'),
    path('fixture/reference/', lambda request: None,
         name='onlyoffice_api_get_reference_data'),
    path('fixture/lock/<str:repo_id>/', lambda request: None,
         name='api-v2.1-file-view'),
    path('fixture/shared-lock/<str:token>/', lambda request: None,
         name='api-v2.1-share-link-online-office-lock'),
]


def template_engine(directory=None):
    library = Library()
    library.filter('email2nickname', lambda value: value)
    engine = Engine(
        dirs=[str(directory or Path(__file__).resolve().parents[3] / 'seahub/templates')],
        libraries={
            'i18n': 'django.templatetags.i18n',
            'static': 'django.templatetags.static',
        },
    )
    engine.template_libraries.update(seahub_tags=library, avatar_tags=Library())
    return engine


def render_editor(template, language='en', directory=None, **overrides):
    context = {
        'LANGUAGE_CODE': 'wrong-context-language',
        'doc_title': FILENAME, 'filename': FILENAME, 'file_name': FILENAME,
        'action_url': 'https://editor.invalid/fixture',
        'access_token': 'synthetic-token', 'access_token_ttl': '123456789',
        'ONLYOFFICE_APIJS_URL': 'https://editor.invalid/api.js',
        'file_type': 'docx', 'document_type': 'word', 'doc_key': 'fixture-key',
        'doc_url': 'https://editor.invalid/fixture.docx',
        'callback_url': 'https://editor.invalid/callback',
        'MEDIA_URL': '/media/', 'repo_id': 'fixture-repo', 'path': '/fixture.docx',
        'request': SimpleNamespace(user=SimpleNamespace(is_authenticated=False)),
        'can_download': False, 'can_copy': False, 'can_edit': False,
    }
    context.update(overrides)
    with translation.override(language):
        return template_engine(directory).get_template(template).render(Context(context))


class EditorMarkup(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def first(self, tag):
        return next(attrs for name, attrs in self.elements if name == tag)


@override_settings(USE_I18N=True, ROOT_URLCONF=__name__, STATIC_URL='/static/')
class EditorTemplateAccessibilityTest(SimpleTestCase):
    def test_shell_uses_active_ui_language_not_stale_context(self):
        for language in ('en', 'de', 'zh-hans', 'ar'):
            for template in TEMPLATES:
                with self.subTest(language=language, template=template):
                    page = EditorMarkup(render_editor(template, language))
                    self.assertEqual(page.first('html')['lang'], language)

    def test_owned_frames_have_descriptive_safely_escaped_names(self):
        for template in TEMPLATES[:2]:
            with self.subTest(template=template):
                page = EditorMarkup(render_editor(template))
                frame = page.first('iframe')
                self.assertEqual(frame['title'], FILENAME)
                self.assertEqual(frame['id'], 'office_frame')
                self.assertEqual(frame['name'], 'office_frame')
                self.assertNotIn('budget', frame)
                self.assertEqual(sum(tag == 'script' and 'src' not in attrs
                                     for tag, attrs in page.elements), 1)

    def test_frame_names_preserve_filenames_across_ui_languages(self):
        for language in ('en', 'de', 'zh-hans', 'ar'):
            for template in TEMPLATES[:2]:
                with self.subTest(language=language, template=template):
                    page = EditorMarkup(render_editor(template, language))
                    self.assertEqual(page.first('iframe')['title'], FILENAME)

    def test_form_handoff_keeps_target_tokens_and_permissions(self):
        for template in TEMPLATES[:2]:
            with self.subTest(template=template):
                page = EditorMarkup(render_editor(template))
                form = page.first('form')
                self.assertEqual(form['target'], 'office_frame')
                self.assertEqual(form['method'], 'post')
                self.assertEqual(form['action'], 'https://editor.invalid/fixture')
                fields = {attrs['name']: attrs for tag, attrs in page.elements
                          if tag == 'input'}
                self.assertEqual(fields['access_token']['value'], 'synthetic-token')
                self.assertEqual(fields['access_token_ttl']['value'], '123456789')
                self.assertTrue(all(field['type'] == 'hidden'
                                    for field in fields.values()))
                frame = page.first('iframe')
                if template == TEMPLATES[0]:
                    self.assertIn('allowfullscreen', frame)
                    self.assertEqual(frame['allow'], 'clipboard-read *; clipboard-write *')

    def test_onlyoffice_retains_sdk_placeholder_without_guessing_frame_markup(self):
        page = EditorMarkup(render_editor(TEMPLATES[2], 'de'))
        self.assertFalse(any(tag == 'iframe' for tag, attrs in page.elements))
        self.assertTrue(any(tag == 'div' and attrs.get('id') == 'placeholder'
                            for tag, attrs in page.elements))


def fixtures(directory=None):
    rendered = {template: render_editor(template, 'de', directory)
                for template in TEMPLATES}
    rendered['onlyoffice-edit'] = render_editor(
        TEMPLATES[2], 'de', directory, can_edit=True, can_copy=True,
        can_download=True, onlyoffice_jwt_token='synthetic-jwt')
    rendered['onlyoffice-share'] = render_editor(
        TEMPLATES[2], 'de', directory, can_edit=True, share_link_token='fixture-share')
    return rendered


if __name__ == '__main__':
    if not settings.configured:
        settings.configure(
            SECRET_KEY='synthetic-editor-tests-only', USE_I18N=True,
            ROOT_URLCONF=__name__, STATIC_URL='/static/', INSTALLED_APPS=[],
        )
        import django
        django.setup()
    if len(sys.argv) > 1 and sys.argv[1] == '--fixtures':
        directory = sys.argv[2] if len(sys.argv) > 2 else None
        print(json.dumps(fixtures(directory)))
    else:
        unittest.main()
