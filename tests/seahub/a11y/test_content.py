import difflib
import hashlib
import importlib.util
import json
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from django.template import Context, Engine, Library
from django.test import SimpleTestCase, override_settings
from django.urls import path
from django.views.generic import TemplateView


ROOT = Path(__file__).resolve().parents[3]
ARTICLES = tuple(sorted(path.name for path in
                        (ROOT / 'seahub/help/templates/help').glob('*.html')
                        if path.name != 'base.html'))
DIFF_CASES = {
    'unchanged': (['alpha', 'beta'], ['alpha', 'beta'], {}),
    'added': (['alpha'], ['alpha', 'beta'], {}),
    'removed': (['alpha', 'beta'], ['alpha'], {}),
    'modified': (['same', 'the sample has an old value', 'end'],
                 ['same', 'the sample has a new value', 'end'], {}),
    'escaped': (['<script>old</script> & value', '\tkeep  spaces'],
                ['<script>new</script> & value', '\tkeep  spaces'], {}),
    'empty': ([], [], {}),
    'context': ([str(number) for number in range(20)],
                [str(number) if number != 10 else 'changed'
                 for number in range(20)], {'context': True, 'numlines': 2}),
    'wrapped': (['a long line with the old value at the end'],
                ['a long line with the new value at the end'],
                {'wrapcolumn': 12}),
}


class ContentMarkup(HTMLParser):
    def __init__(self, markup):
        super().__init__()
        self.elements = []
        self.stack = []
        self.presentation = []
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        hidden = ('sr-only' in attributes.get('class', '').split() or
                  any(element.hidden for element in self.stack))
        element = SimpleNamespace(
            tag=tag, attrs=attributes, text=[], hidden=hidden,
            parent=self.stack[-1] if self.stack else None)
        self.elements.append(element)
        if not hidden:
            visible_attrs = sorted(
                (name, value) for name, value in attrs
                if not name.startswith('aria-') and name not in
                ('alt', 'id', 'headers', 'scope', 'role'))
            self.presentation.append(('start', tag, visible_attrs))
        if tag not in ('area', 'base', 'br', 'col', 'embed', 'hr', 'img',
                       'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'):
            self.stack.append(element)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if not any(element.tag == tag for element in self.stack):
            return
        while self.stack:
            element = self.stack.pop()
            if element.tag == tag:
                if not element.hidden:
                    self.presentation.append(('end', tag))
                break

    def handle_data(self, data):
        for element in self.stack:
            element.text.append(data)
        if data.strip() and not any(element.hidden for element in self.stack):
            self.presentation.append(('text', ' '.join(data.split())))

    def by_id(self, identifier):
        return next(element for element in self.elements
                    if element.attrs.get('id') == identifier)

    def fingerprint(self):
        return hashlib.sha256(json.dumps(
            self.presentation, ensure_ascii=False).encode()).hexdigest()


def template_engine():
    engine = Engine(
        dirs=[str(ROOT / 'seahub' / 'help' / 'templates'),
              str(ROOT / 'seahub' / 'templates')],
        loaders=[('django.template.loaders.locmem.Loader', {
            'help/base.html': '{% block help_con %}{% endblock %}',
            'base_wide_page.html': (
                '{% block extra_style %}{% endblock %}'
                '{% block wide_page_content %}{% endblock %}'),
        }), 'django.template.loaders.filesystem.Loader'],
        libraries={'i18n': 'django.templatetags.i18n'})
    tags = Library()
    for name in ('email2nickname', 'translate_seahub_time', 'strip_slash'):
        tags.filter(name, lambda value: value)
    tags.simple_tag(lambda *args, **kwargs: '', name='avatar')
    tags.simple_tag(lambda *args, **kwargs: '/synthetic/', name='url')
    engine.template_libraries.update(seahub_tags=tags, avatar_tags=tags)
    engine.template_builtins.append(tags)
    return engine


def diff_renderer():
    spec = importlib.util.spec_from_file_location(
        'content_a11y_htmldiff', ROOT / 'seahub' / 'utils' / 'htmldiff.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def render_article(name):
    return template_engine().get_template('help/' + name).render(Context({
        'MEDIA_URL': '/media/', 'SITE_ROOT': '/',
    }))


def render_diff(case, **overrides):
    before, after, options = DIFF_CASES[case]
    options = options.copy()
    wrapcolumn = options.pop('wrapcolumn', None)
    module = diff_renderer()
    with patch.object(module, '_mdiff', difflib._mdiff):
        rows = module.HtmlDiff(wrapcolumn=wrapcolumn).make_table(
            before, after, **options)
    context = {
        'u_filename': 'synthetic.txt', 'zipped': [], 'repo': {},
        'current_commit': {'creator_name': 'author@example.invalid',
                           'ctime': '2026-01-01'},
        'diff_result_table': rows,
    }
    context.update(overrides)
    return template_engine().get_template('text_diff.html').render(
        Context(context))


@override_settings(USE_I18N=False)
class ContentAccessibilityTest(SimpleTestCase):
    def test_instructional_images_supply_missing_steps(self):
        expected = {
            'departments.html': {
                'sys_admin_departments.png': ('System Admin', 'Departments',
                                              'New Sub-department', 'Add Member',
                                              'New Library'),
                'dept_admin_manage_members.png': ('department settings',
                                                  'Manage Members'),
                'dept_admin_manage_libs.png': ('share', 'delete',
                                              'operations menu', 'Rename',
                                              'Permission', 'Details'),
            },
            'drive_client_2.0_for_windows_10.html': {
                'image-1584674764725.png': (
                    'Pinned full files use a solid green circle',
                    'Full files use an outlined green circle',
                    'Placeholder files use an outlined blue cloud'),
            },
            'install_sync.html': {
                'seafile-init-choose-folder.png': ('Choose', 'Next',
                                                   'Seafile subfolder',
                                                   'downloaded libraries'),
                'seafile-add-account.png': ('server address', 'Login'),
                'seafile-sync-library.png': ('Right-click', 'Sync this library'),
                'seafile-create-library.png': ('Select or Drop Folder',),
                'seafile-create-library-02.png': ('folder path', 'library name',
                                                   'encryption', 'OK'),
            },
            'file_locking.html': {
                'web_lock_file.png': ('Lock', 'operations menu'),
                'desktop_my_locked_file.png': ('Right-click', 'locked by you',
                                               'unlock this file', 'Seafile menu'),
            },
            'libraries_managing.html': {
                'libraries_view.png': ('My Libraries', 'New Library'),
                'library_browse.png': ('Upload', 'New', 'operations menu',
                                       'Rename', 'Move', 'Copy'),
            },
            'manage_library_as_wiki.html': {
                'column_view.png': ('folder tree', 'folder contents'),
                'context_menu.png': ('Right-click', 'Rename', 'Move',
                                      'Open via Client'),
                'markdown_editor.png': ('formatting toolbar', 'editable table'),
                'file_history.png': ('History Versions', 'saved file versions',
                                      'preview'),
                'editor_side_bar.png': ('table of contents', 'file information',
                                         'comments', 'tags', 'participants'),
                'tags_from_side_bar.png': ('name', 'color', 'Save', 'New Tag'),
                'tags_from_file_browser.png': ('operations menu', 'Tags'),
                'tags_summary.png': ('library tags', 'number of files'),
            },
            'setting_library_history.html': {
                'history_setting.png': ('My Libraries', 'operations menu',
                                         'History Setting'),
            },
            'sync_interval.html': {
                'set-sync-interval.png': ('Right-click', 'Set sync Interval'),
            },
            'unsync_resync.html': {
                'resync-a-library.png': ('Right-click', 'Resync this library',
                                          'Unsync is a separate option'),
            },
            'using_drive_client.html': {
                'drive-login.png': ('server address', 'Login'),
                'drive-fetch-finish.png': ('Finish', 'SeaDrive folder'),
                'drive.png': ('SeaDrive folder', 'File Explorer'),
                'drive-cache-setting.png': ('Settings', 'Advanced', 'minutes',
                                             'GB'),
                'drive-accounts.png': ('Accounts', 'switch', 'add'),
            },
        }
        for name, alternatives in expected.items():
            images = {Path(element.attrs['src']).name: element.attrs
                      for element in ContentMarkup(render_article(name)).elements
                      if element.tag == 'img'}
            for filename, phrases in alternatives.items():
                with self.subTest(article=name, image=filename):
                    for phrase in phrases:
                        self.assertIn(phrase, images[filename]['alt'])

    def test_all_help_images_have_context_appropriate_alternatives(self):
        expected = {
            'drive_client_2.0_for_windows_10.html': ('image-1584674198415.png',
                                                    'image-1584675088821.png'),
            'install_sync.html': ('seafile-cloud-file-browser.png',),
            'file_locking.html': ('web_file_locked.png',
                                  'desktop_lock_file.png',
                                  'desktop_other_locked_file.png'),
            'folder_permission.html': ('web_folder_perm_ro.png',),
            'read-only_syncing.html': ('read_only.png',),
            'selective_sync.html': ('sync-a-sub-folder.png',),
            'syncing_existing_folders.html': ('seafile-sync-library.png',
                                               'sync-with-an-existing-01.png',
                                               'sync-with-an-existing-02.png'),
        }
        for name in ARTICLES:
            images = {Path(element.attrs['src']).name: element.attrs
                      for element in ContentMarkup(render_article(name)).elements
                      if element.tag == 'img'}
            decorative = expected.get(name, ())
            self.assertTrue(set(decorative).issubset(images), name)
            for filename, attributes in images.items():
                with self.subTest(article=name, image=filename):
                    self.assertIn('alt', attributes)
                    self.assertTrue((ROOT / 'media/img/help' / filename).is_file())
                    if filename in decorative:
                        self.assertEqual(attributes['alt'], '')
                        self.assertNotIn('aria-label', attributes)
                    else:
                        self.assertTrue(attributes['alt'].strip())

    def test_nonempty_help_image_alternatives_are_translatable(self):
        for name in ARTICLES:
            original = [element.attrs['alt'] for element in
                        ContentMarkup(render_article(name)).elements
                        if element.tag == 'img']
            with patch('django.utils.translation._trans.gettext',
                       side_effect=lambda message: 'Translated: ' + message):
                translated = [element.attrs['alt'] for element in
                              ContentMarkup(render_article(name)).elements
                              if element.tag == 'img']
            with self.subTest(article=name):
                self.assertEqual(translated, [
                    'Translated: ' + alternative if alternative else ''
                    for alternative in original
                ])

    def test_drive_tables_use_existing_headings_as_names(self):
        page = ContentMarkup(render_article('using_drive_client.html'))
        tables = [element for element in page.elements if element.tag == 'table']
        self.assertEqual(len(tables), 2)
        self.assertEqual([''.join(page.by_id(
            table.attrs['aria-labelledby']).text) for table in tables],
            ['Synced State', 'Special States'])

    def test_drive_cells_reference_their_state_and_column_headers(self):
        page = ContentMarkup(render_article('using_drive_client.html'))
        columns = [element for element in page.elements if element.tag == 'th']
        self.assertEqual(len(columns), 6)
        self.assertTrue(all(column.attrs['scope'] == 'col'
                            for column in columns))
        row_headers = [element for element in page.elements
                       if element.attrs.get('role') == 'rowheader']
        self.assertEqual(len(row_headers), 6)
        for row_header in row_headers:
            with self.subTest(state=''.join(row_header.text)):
                self.assertEqual(row_header.tag, 'td')
                cells = [element for element in page.elements
                         if element.parent is row_header.parent]
                self.assertEqual(len(cells), 3)
                self.assertEqual(page.by_id(
                    row_header.attrs['headers']).tag, 'th')
                for cell in cells[1:]:
                    column_id, state_id = cell.attrs['headers'].split()
                    self.assertEqual(page.by_id(column_id).tag, 'th')
                    self.assertEqual(state_id, row_header.attrs['id'])

    def test_diff_table_and_all_four_columns_have_names(self):
        page = ContentMarkup(render_diff('modified'))
        table = next(element for element in page.elements
                     if element.tag == 'table')
        self.assertEqual(table.attrs['aria-label'], 'File modification details')
        expected = {
            'diff-before-line-number': 'Line number before modification',
            'diff-before-content': 'before modification',
            'diff-after-line-number': 'Line number after modification',
            'diff-after-content': 'after modification',
        }
        for identifier, name in expected.items():
            with self.subTest(header=identifier):
                header = page.by_id(identifier)
                self.assertEqual(header.tag, 'th')
                self.assertEqual(header.attrs['scope'], 'col')
                self.assertEqual(header.attrs.get(
                    'aria-label', ''.join(header.text)), name)
                if 'line-number' in identifier:
                    children = [element for element in page.elements
                                if element.parent is header]
                    self.assertEqual(len(children), 1)
                    self.assertTrue(children[0].hidden)

    def test_diff_rows_reference_the_correct_version_and_line_number(self):
        for case in DIFF_CASES:
            with self.subTest(case=case):
                page = ContentMarkup(render_diff(case))
                identifiers = [element.attrs['id'] for element in page.elements
                               if 'id' in element.attrs]
                self.assertEqual(len(identifiers), len(set(identifiers)))
                rows = [element for element in page.elements
                        if element.tag == 'tr']
                for row in rows[1:]:
                    cells = [element for element in page.elements
                             if element.parent is row]
                    self.assertEqual(len(cells), 4)
                    for side, version in enumerate(('before', 'after')):
                        line_number, content = cells[side * 2:side * 2 + 2]
                        self.assertEqual(line_number.attrs['headers'],
                                         'diff-' + version + '-line-number')
                        headers = content.attrs['headers'].split()
                        self.assertEqual(headers[0],
                                         'diff-' + version + '-content')
                        if 'id' in line_number.attrs:
                            self.assertEqual(line_number.attrs['role'],
                                             'rowheader')
                            self.assertEqual(headers[1], line_number.attrs['id'])
                        else:
                            self.assertEqual(len(headers), 1)
                            self.assertNotIn('role', line_number.attrs)

    def test_changed_lines_have_nonvisual_removed_or_added_prefixes(self):
        for case in DIFF_CASES:
            with self.subTest(case=case):
                page = ContentMarkup(render_diff(case))
                content_cells = [element for element in page.elements
                                 if element.tag == 'td' and
                                 not element.attrs.get('class') == 'diff-header']
                for cell in content_cells:
                    cues = [element for element in page.elements
                            if element.parent is cell and element.hidden]
                    if cell.attrs.get('class') in ('diff-add', 'diff-sub',
                                                    'diff-chg'):
                        self.assertEqual(len(cues), 1)
                        cue = ''.join(cues[0].text)
                        self.assertEqual(cue, 'Removed: ' if
                                         'diff-before-content' in
                                         cell.attrs['headers'] else 'Added: ')
                        self.assertTrue(''.join(cell.text).startswith(cue))
                        self.assertNotIn('aria-hidden', cues[0].attrs)
                    else:
                        self.assertEqual(cues, [])

    def test_diff_content_and_translated_cues_remain_escaped(self):
        page = ContentMarkup(render_diff('escaped'))
        self.assertFalse(any(element.tag == 'script' for element in page.elements))
        self.assertTrue(any('<script>old</script>' in ''.join(element.text)
                            for element in page.elements if element.tag == 'td'))
        module = diff_renderer()
        renderer = module.HtmlDiff()
        renderer._make_prefix()
        with patch.object(module, '_', return_value='<removed & added>') as label:
            formatted = renderer._format_line(0, True, 1, '\0-old\1')
        label.assert_called_once_with('Removed:')
        self.assertIn('&lt;removed &amp; added&gt;', formatted)
        self.assertNotIn('<removed', formatted)

    def test_new_blank_file_branch_does_not_add_a_table_or_change_cues(self):
        page = ContentMarkup(render_diff('empty', is_new_file=True))
        self.assertFalse(any(element.tag == 'table' or element.hidden
                             for element in page.elements))
        self.assertTrue(any("It's a newly-created blank file." in
                            ''.join(element.text) for element in page.elements))

    def test_article_visible_markup_matches_baseline(self):
        baseline = json.loads((Path(__file__).parent /
                               'presentation.json').read_text())
        for name in ARTICLES:
            with self.subTest(article=name):
                self.assertEqual(ContentMarkup(render_article(name)).fingerprint(),
                                 baseline['articles'][name])

    def test_diff_visible_markup_matches_baseline(self):
        baseline = json.loads((Path(__file__).parent /
                               'presentation.json').read_text())
        for case in DIFF_CASES:
            with self.subTest(case=case):
                self.assertEqual(ContentMarkup(render_diff(case)).fingerprint(),
                                 baseline['diffs'][case])


urlpatterns = [path('i18n/', TemplateView.as_view(), name='i18n')]


class PageMarkupParser(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def element_by_id(self, element_id):
        return next(element for element in self.elements
                    if element[1].get('id') == element_id)


@override_settings(ROOT_URLCONF=__name__, USE_I18N=False, STORAGES={
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
})
class HelpAccessibilityTest(SimpleTestCase):
    def setUp(self):
        seahub_root = Path(__file__).resolve().parents[3] / 'seahub'
        self.help_templates = seahub_root / 'help' / 'templates'
        self.engine = Engine(
            dirs=[str(self.help_templates),
                  str(seahub_root / 'templates')],
            libraries={
                'i18n': 'django.templatetags.i18n',
                'static': 'django.templatetags.static',
            },
        )
        self.engine.template_libraries['seahub_tags'] = Library()
        self.context = {
            'request': SimpleNamespace(
                user=SimpleNamespace(is_authenticated=False), session={}),
            'site_title': 'Seafile',
            'site_description': '',
            'branding_css': '',
            'SITE_ROOT': '/',
            'MEDIA_URL': '/media/',
            'LANGUAGE_CODE': 'en',
            'LANGUAGES': [('en', 'English'), ('de', 'Deutsch')],
        }

    def render_page(self, template_name='help/introduction.html'):
        template = self.engine.get_template(template_name)
        return PageMarkupParser(template.render(Context(self.context)))

    def test_shared_base_has_one_banner_and_one_main(self):
        for authenticated in (False, True):
            with self.subTest(authenticated=authenticated):
                self.context['request'].user.is_authenticated = authenticated
                page = self.render_page('base.html')

                self.assertEqual(page.element_by_id('header')[0], 'header')
                self.assertEqual(page.element_by_id('main')[0], 'main')
                self.assertEqual(sum(tag == 'header' for tag, attrs in page.elements), 1)
                self.assertEqual(sum(tag == 'main' for tag, attrs in page.elements), 1)

    def test_hidden_header_keeps_its_existing_class(self):
        template = self.engine.from_string(
            '{% extends "base.html" %}'
            '{% block header_css_class %}hide{% endblock %}')
        page = PageMarkupParser(template.render(Context(self.context)))

        self.assertEqual(page.element_by_id('header'),
                         ('header', {'id': 'header', 'class': 'hide'}))

    def test_help_navigation_is_named_and_matches_its_toggle(self):
        page = self.render_page()
        nav_tag, nav_attrs = page.element_by_id('help-side-nav')
        toggle_attrs = page.element_by_id('js-toggle-side-nav')[1]

        self.assertEqual(nav_tag, 'nav')
        self.assertEqual(nav_attrs['aria-label'], 'Help')
        self.assertEqual(toggle_attrs['aria-controls'], nav_attrs['id'])
        self.assertEqual(toggle_attrs['aria-expanded'], 'false')

    def test_all_help_articles_have_named_keyboard_scroll_regions(self):
        articles = sorted((self.help_templates / 'help').glob('*.html'))
        articles = [article for article in articles if article.name != 'base.html']
        self.assertTrue(articles)

        for article in articles:
            with self.subTest(article=article.name):
                page = self.render_page('help/' + article.name)
                panel_attrs = page.element_by_id('right-panel')[1]
                heading_tag, heading_attrs = page.element_by_id('help-page-title')

                self.assertEqual(panel_attrs['tabindex'], '0')
                self.assertEqual(panel_attrs['role'], 'region')
                self.assertEqual(panel_attrs['aria-labelledby'], heading_attrs['id'])
                self.assertEqual(heading_tag, 'h3')
                self.assertEqual(heading_attrs['class'], 'hd')
                self.assertEqual(sum(attrs.get('id') == heading_attrs['id']
                                     for tag, attrs in page.elements), 1)

    def test_mobile_help_logo_has_a_site_name(self):
        page = self.render_page()

        self.assertIn(('a', {'href': '/', 'aria-label': 'Seafile'}), page.elements)

    def test_language_links_declare_their_language(self):
        page = self.render_page('base.html')
        links = [attrs for tag, attrs in page.elements
                 if tag == 'a' and attrs.get('href', '').startswith('/i18n/?lang=')]

        self.assertEqual(len(links), 2)
        for link, language in zip(links, ('en', 'de')):
            with self.subTest(language=language):
                self.assertEqual(link['lang'], language)
                self.assertEqual(link['hreflang'], language)

    def test_help_page_has_a_descriptive_fallback_title(self):
        html = self.engine.get_template('help/introduction.html').render(
            Context(self.context))

        self.assertIn('<title>Help - Seafile</title>', html)
