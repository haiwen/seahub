from copy import deepcopy
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.http import Http404, HttpResponse
from django.template import Context, Engine
from django.test import RequestFactory, SimpleTestCase
from django.utils.html import escape
from django.utils.http import http_date
from requests.exceptions import Timeout

from seahub.wiki2 import views
from seahub.wiki2.utils import get_wiki_config


class PageMetadataParser(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.title = ''
        self.in_title = False
        self.metadata = {}
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title':
            self.in_title = True
        if tag == 'meta' and attrs.get('property', '').startswith('og:'):
            self.metadata.setdefault(attrs['property'], []).append(attrs['content'])

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


class PublishedWikiMetadataTest(SimpleTestCase):
    def setUp(self):
        self.wiki = SimpleNamespace(repo_id='repo-id', name='Manual', id='wiki-id')
        self.publish = Mock(repo_id='repo-id', enable_server_render=False, visit_count=0)
        self.config = {
            'pages': [
                {'id': 'AAAA', 'name': 'Install', 'path': '/install.sdoc'},
                {'id': 'BBBB', 'name': 'Upgrade', 'path': '/upgrade.sdoc'},
            ],
            'navigation': [{'id': 'AAAA', 'type': 'page'}],
        }
        self.config_mtime = 200
        self.engine = Engine(
            dirs=[str(Path(views.__file__).resolve().parents[1] / 'templates')],
            libraries={
                'i18n': 'django.templatetags.i18n',
                'static': 'django.templatetags.static',
                'seahub_tags': 'seahub.base.templatetags.seahub_tags',
                'webpack_loader': 'webpack_loader.templatetags.webpack_loader',
            },
        )
        self.start_patch('Wiki2Publish.objects.filter').return_value.first.return_value = self.publish
        self.start_patch('Wiki.objects.get').return_value = self.wiki
        self.start_patch('get_repo_owner').return_value = 'owner@example.com'
        self.read_config = self.start_patch('get_wiki_config')
        self.read_config.side_effect = lambda *args, **kwargs: deepcopy(self.config)
        self.api = self.start_patch('seafile_api')
        self.api.get_repo.return_value = SimpleNamespace(name='Manual')
        self.api.get_dirent_by_path.side_effect = lambda repo, path: SimpleNamespace(
            modifier='owner@example.com',
            mtime=self.config_mtime if path == '_Internal/Wiki/index.json' else 100)
        self.start_patch('get_seadoc_file_uuid').return_value = 'doc-uuid'
        self.start_patch('gen_file_get_url').return_value = 'https://files.example.com/doc'
        self.export = self.start_patch('sdoc_export_to_html')
        self.export.return_value = SimpleNamespace(ok=True, content=b'<p>Document</p>')
        self.start_patch('render').side_effect = self.render_page
        bundle_patch = patch('webpack_loader.utils.get_as_tags', return_value=[])
        bundle_patch.start()
        self.addCleanup(bundle_patch.stop)
        text_extensions_patch = patch('seahub.utils.get_conf_text_ext', return_value=[])
        text_extensions_patch.start()
        self.addCleanup(text_extensions_patch.stop)

    def start_patch(self, target):
        patcher = patch('seahub.wiki2.views.' + target)
        mocked = patcher.start()
        self.addCleanup(patcher.stop)
        return mocked

    def render_page(self, request, template_name, context):
        # Render the real templates; only asset bundles and external services are mocked.
        context = dict(context, request=request, service_url='https://wiki.example.com',
                       site_name='Seafile', site_description='', branding_css='',
                       MEDIA_URL='/media/', LANGUAGE_CODE='en')
        response = HttpResponse(self.engine.get_template(template_name).render(Context(context)))
        response.template_name = template_name
        return response

    def get_page(self, page_id=None):
        path = '/wiki/publish/manual/'
        if page_id:
            path += page_id + '/'
        request = RequestFactory().get(path)
        return views.wiki_publish_view(request, 'manual', page_id)

    def assert_metadata(self, response, name, page_id=None):
        self.assertEqual(response.status_code, 200)
        metadata = PageMetadataParser(response.content.decode())
        title = '%s - Manual' % name if name else 'Manual'
        self.assertEqual(metadata.title, title)
        self.assertEqual(metadata.metadata['og:title'], [title])
        self.assertEqual(metadata.metadata['og:description'], [name or 'Manual'])
        path = '/wiki/publish/manual/' + (page_id + '/' if page_id else '')
        self.assertEqual(metadata.metadata['og:url'], ['https://wiki.example.com' + path])

    def test_different_pages_have_distinct_metadata_with_and_without_ssr(self):
        for ssr in (False, True):
            self.publish.enable_server_render = ssr
            for page_id, name in [('AAAA', 'Install'), ('BBBB', 'Upgrade')]:
                with self.subTest(ssr=ssr, page_id=page_id):
                    self.read_config.reset_mock()
                    response = self.get_page(page_id)
                    self.assert_metadata(response, name, page_id)
                    self.assertEqual(response.template_name, 'wiki/wiki_publish_ssr.html'
                                     if ssr else 'wiki/wiki_publish.html')
                    self.read_config.assert_called_once_with('repo-id', '', timeout=(3, 5))

    def test_root_and_invalid_id_use_default_page(self):
        for ssr in (False, True):
            self.publish.enable_server_render = ssr
            for page_id in (None, 'XXXX'):
                with self.subTest(ssr=ssr, page_id=page_id):
                    self.assert_metadata(self.get_page(page_id), 'Install', page_id)

    def test_rename_updates_metadata_and_last_modified(self):
        for ssr in (False, True):
            with self.subTest(ssr=ssr):
                self.publish.enable_server_render = ssr
                self.config['pages'][1]['name'] = 'Upgrade'
                self.config_mtime = 200
                before = self.get_page('BBBB')
                self.assert_metadata(before, 'Upgrade', 'BBBB')
                self.config['pages'][1]['name'] = 'Migration'
                self.config_mtime = 300
                after = self.get_page('BBBB')
                self.assert_metadata(after, 'Migration', 'BBBB')
                self.assertEqual(before['Last-Modified'], http_date(200))
                self.assertEqual(after['Last-Modified'], http_date(300))

    def test_configuration_timeout_falls_back_to_wiki_name(self):
        self.read_config.side_effect = Timeout('configuration timeout')
        for ssr in (False, True):
            self.publish.enable_server_render = ssr
            response = self.get_page('BBBB')
            self.assert_metadata(response, '', 'BBBB')
            self.assertEqual(response.template_name, 'wiki/wiki_publish.html')
        self.export.assert_not_called()

    def test_converter_failure_keeps_page_metadata(self):
        self.publish.enable_server_render = True
        for result in (Timeout('converter timeout'), SimpleNamespace(ok=False, status_code=503)):
            with self.subTest(result=result):
                self.export.side_effect = result if isinstance(result, Exception) else None
                self.export.return_value = result
                response = self.get_page('BBBB')
                self.assert_metadata(response, 'Upgrade', 'BBBB')
                self.assertEqual(response.template_name, 'wiki/wiki_publish.html')

    def test_fallback_preserves_react_default_page_selection(self):
        self.config['navigation'].insert(0, {'id': 'BBBB', 'type': 'folder'})
        self.publish.enable_server_render = True
        self.assert_metadata(self.get_page(), 'Upgrade')
        self.export.side_effect = Timeout('converter timeout')
        self.assert_metadata(self.get_page(), 'Install')

    def test_empty_wiki_uses_wiki_name(self):
        self.config = {'pages': [], 'navigation': []}
        for ssr in (False, True):
            self.publish.enable_server_render = ssr
            self.assert_metadata(self.get_page(), '')

    def test_page_names_are_html_escaped(self):
        name = '升级 "A" & <B>'
        self.config['pages'][1]['name'] = name
        for ssr in (False, True):
            self.publish.enable_server_render = ssr
            response = self.get_page('BBBB')
            self.assert_metadata(response, name, 'BBBB')
            self.assertContains(response, 'content="%s - Manual"' % escape(name))

    def test_unpublished_wiki_is_not_accessible(self):
        self.start_patch('Wiki2Publish.objects.filter').return_value.first.return_value = None
        with self.assertRaises(Http404):
            self.get_page('BBBB')
        self.read_config.assert_not_called()


class WikiConfigTimeoutTest(SimpleTestCase):
    @patch('seahub.wiki2.utils.requests.get')
    @patch('seahub.wiki2.utils.gen_inner_file_get_url', return_value='http://files/config')
    @patch('seahub.wiki2.utils.seafile_api')
    def test_timeout_is_optional_and_forwarded(self, api, download_url, request):
        request.return_value.content = b'{"pages": []}'
        self.assertEqual(get_wiki_config('repo-id', ''), {'pages': []})
        request.assert_called_with('http://files/config', timeout=None)
        self.assertEqual(get_wiki_config('repo-id', '', timeout=(3, 5)), {'pages': []})
        request.assert_called_with('http://files/config', timeout=(3, 5))
