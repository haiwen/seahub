import json
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace

from django.template import Context, Engine, Library
from django.test import SimpleTestCase, override_settings


def wiki_template_engine():
    def identity(value):
        return value

    library = Library()
    library.filter('email2nickname', identity)
    library.filter('email2contact_email', identity)
    bundles = Library()
    bundles.simple_tag(lambda *args: '', name='render_bundle')
    engine = Engine(
        dirs=[str(Path(__file__).resolve().parents[3] / 'seahub/templates')],
        libraries={
            'i18n': 'django.templatetags.i18n',
            'static': 'django.templatetags.static',
        },
    )
    engine.template_libraries.update(seahub_tags=library, webpack_loader=bundles)
    return engine


def wiki_context(is_pro=False):
    def item(page_id, name, depth=0, children=None, expanded=False):
        return {
            'id': page_id, 'name': name, 'depth': depth,
            'url': '/wiki/publish/fixture/' + page_id + '/',
            'is_current': page_id == 'HOME', 'is_expanded': expanded,
            'has_children': bool(children), 'children': children or [],
        }

    leaf = item('LEAF', 'Leaf page', depth=2)
    child = item('CHLD', 'Nested section', depth=1, children=[leaf], expanded=True)
    navigation = [
        item('HOME', 'Home page'),
        item('BRCH', 'Section & "quoted" <title>', children=[child]),
        item('LAST', 'Last page'),
    ]
    pages = [navigation[0], navigation[1], child, leaf, navigation[2]]
    return Context({
        'request': SimpleNamespace(
            user=SimpleNamespace(username='', is_authenticated=False), session={}),
        'wiki_navigation': navigation,
        'wiki_title': 'Home page', 'wiki_repo_name': 'Synthetic wiki',
        'wiki': SimpleNamespace(id='fixture', name='Synthetic wiki'),
        'wiki_pages_json': json.dumps({page['id']: page for page in pages}),
        'wiki_html': '<p>Synthetic published content.</p><a href="#reading">Reading link</a>',
        'publish_url': 'fixture', 'LANGUAGE_CODE': 'en',
        'MEDIA_URL': '/media/', 'STATIC_URL': '/media/',
        'site_description': '', 'branding_css': '', 'is_pro': is_pro,
        'share_link_password_min_length': 0,
        'share_link_password_strength_level': 0,
        'thumbnail_size_for_original': 0, 'thumbnail_size_for_grid': 0,
        'thumbnail_default_size': 0, 'repo_password_min_length': 0,
    })


class WikiMarkupParser(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def by_id(self, element_id):
        return next(element for element in self.elements
                    if element[1].get('id') == element_id)


@override_settings(USE_I18N=False, STORAGES={
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
})
class PublishedWikiNavigationTemplateTest(SimpleTestCase):
    def setUp(self):
        self.engine = wiki_template_engine()

    def render(self, is_pro=False, empty=False):
        context = wiki_context(is_pro)
        if empty:
            context['wiki_navigation'] = []
        return WikiMarkupParser(self.engine.get_template(
            'wiki/wiki_publish_ssr.html').render(context))

    def test_navigation_uses_a_named_landmark_and_native_lists(self):
        page = self.render()
        self.assertEqual(page.by_id('wiki-side-panel')[0], 'nav')
        self.assertEqual(page.by_id('wiki-side-panel')[1]['aria-label'],
                         'Wiki navigation')
        self.assertEqual(page.by_id('wiki-nav-tree')[0], 'ul')
        self.assertFalse(any(attrs.get('role') in ('tree', 'treeitem', 'group')
                             for tag, attrs in page.elements))

    def test_disclosures_reference_their_page_and_controlled_list(self):
        page = self.render()
        for page_id, expanded in (('BRCH', 'false'), ('CHLD', 'true')):
            with self.subTest(page_id=page_id):
                tag, toggle = page.by_id('wiki-nav-toggle-' + page_id)
                self.assertEqual((tag, toggle['type']), ('button', 'button'))
                self.assertEqual(toggle['aria-expanded'], expanded)
                self.assertEqual(toggle['aria-label'], 'Toggle navigation section')
                self.assertEqual(toggle['aria-labelledby'].split(),
                                 [toggle['id'], 'wiki-nav-page-' + page_id])
                self.assertEqual(page.by_id(toggle['aria-controls'])[0], 'ul')
                self.assertEqual(page.by_id('wiki-nav-page-' + page_id)[1]['title'],
                                 'Section & "quoted" <title>' if page_id == 'BRCH'
                                 else 'Nested section')

    def test_collapsed_descendants_are_inert_without_changing_animation_markup(self):
        page = self.render()
        collapsed = page.by_id('wiki-nav-children-BRCH')[1]
        expanded = page.by_id('wiki-nav-children-CHLD')[1]
        self.assertIn('inert', collapsed)
        self.assertEqual(collapsed['aria-hidden'], 'true')
        self.assertIn('collapsed', collapsed['class'].split())
        self.assertEqual(collapsed['style'], 'height: 0;')
        self.assertNotIn('inert', expanded)
        self.assertEqual(expanded['style'], 'height: auto;')
        self.assertNotIn('hidden', collapsed)

    def test_only_the_current_page_link_exposes_current_page_state(self):
        page = self.render()
        links = [attrs for tag, attrs in page.elements
                 if 'wiki-page-item-main' in attrs.get('class', '').split()]
        self.assertEqual(len(links), 5)
        self.assertEqual([attrs['data-page-id'] for attrs in links
                          if attrs.get('aria-current') == 'page'], ['HOME'])
        self.assertTrue(all('aria-current' not in attrs for attrs in links
                            if attrs['data-page-id'] != 'HOME'))
        self.assertEqual(page.by_id('wiki-nav-page-LEAF')[1]['href'],
                         '/wiki/publish/fixture/LEAF/')

    def test_mobile_trigger_controls_a_non_modal_panel_with_decorative_overlay(self):
        for is_pro in (False, True):
            with self.subTest(is_pro=is_pro):
                page = self.render(is_pro)
                trigger = page.by_id('menu-toggle-btn')[1]
                self.assertEqual(trigger['type'], 'button')
                self.assertEqual(trigger['aria-controls'], 'wiki-side-panel')
                self.assertEqual(trigger['aria-expanded'], 'false')
                self.assertNotIn('aria-modal', page.by_id('wiki-side-panel')[1])
                self.assertEqual(page.by_id('side-panel-close')[1]['type'], 'button')
                self.assertEqual(page.by_id('wiki-mobile-overlay')[1]['aria-hidden'], 'true')

    def test_empty_navigation_preserves_landmark_and_mobile_controls(self):
        page = self.render(empty=True)
        self.assertEqual(page.by_id('wiki-side-panel')[0], 'nav')
        self.assertEqual(page.by_id('menu-toggle-btn')[1]['aria-controls'],
                         'wiki-side-panel')
        self.assertFalse(any(tag == 'li' for tag, attrs in page.elements))

    def test_search_combobox_has_a_name_and_complete_result_relationships(self):
        page = self.render(is_pro=True)
        field = page.by_id('wiki-search-input')[1]
        self.assertEqual(field['role'], 'combobox')
        self.assertEqual(field['aria-label'], 'Search')
        self.assertEqual(field['aria-autocomplete'], 'list')
        self.assertEqual(field['aria-expanded'], 'false')
        self.assertEqual(field['aria-busy'], 'false')
        self.assertEqual(page.by_id(field['aria-controls'])[1]['role'], 'listbox')
        self.assertEqual(page.by_id(field['aria-describedby'])[1]['role'], 'status')
        self.assertNotIn('aria-activedescendant', field)
        self.assertEqual(page.by_id('wiki-search-modal')[1]['aria-hidden'], 'true')

    def test_search_and_navigation_announcements_are_nonvisual_and_atomic(self):
        page = self.render(is_pro=True)
        for element_id in ('wiki-search-announcement', 'wiki-navigation-status'):
            attributes = page.by_id(element_id)[1]
            self.assertIn('sr-only', attributes['class'].split())
            self.assertEqual(attributes['role'], 'status')
            self.assertEqual(attributes['aria-live'], 'polite')
            self.assertEqual(attributes['aria-atomic'], 'true')
        self.assertEqual(page.by_id('wiki-page-title')[1]['tabindex'], '-1')

    def test_community_wiki_does_not_gain_search_controls(self):
        page = self.render()
        identifiers = [attrs.get('id') for tag, attrs in page.elements]
        self.assertNotIn('wiki-search-trigger', identifiers)
        self.assertNotIn('wiki-search-modal', identifiers)

    def test_desktop_splitter_has_a_name_controlled_panel_and_width_range(self):
        page = self.render()
        attributes = page.by_id('wiki-resize-handle')[1]
        self.assertEqual(attributes['role'], 'separator')
        self.assertEqual(attributes['aria-label'], 'Resize navigation panel')
        self.assertEqual(attributes['aria-orientation'], 'vertical')
        self.assertEqual(attributes['aria-controls'], 'wiki-side-panel')
        self.assertEqual(attributes['aria-valuemin'], '160')
        self.assertEqual(attributes['aria-valuemax'], '520')
        self.assertEqual(attributes['aria-valuenow'], '260')
        self.assertEqual(attributes['tabindex'], '0')
