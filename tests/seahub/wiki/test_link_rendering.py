import unittest
from unittest.mock import patch

from lxml import html

from seahub.wiki import views


class WikiLinkRenderingTest(unittest.TestCase):
    def render_link(self, href, slug='test-wiki', token='share-token'):
        # A literal double quote makes the sanitizer use single-quoted attributes.
        content = "<a href='%s'>link</a>" % href
        with patch.object(views, 'get_service_url', return_value='https://example.com'):
            result, title, outlines, error = views.format_markdown_file_content(
                slug, 'repo-id', '/page.md', token, content)
        self.assertIsNone(error)
        doc = html.fragment_fromstring(str(result), create_parent='div')
        self.assertEqual(len(doc.xpath('.//a')), 1)
        link = doc.xpath('.//a')[0]
        self.assertEqual(set(link.attrib), {'href'})
        return link.get('href')

    def test_slug_cannot_inject_link_attributes(self):
        slug = "wiki'onmouseover='alert(1)'x='"
        for href, expected in [
                ('https://example.com/lib/repo-id/file/a"b.md',
                 'https://example.com/published/%s/a"b.md' % slug),
                ('https://example.com/library/repo-id/name/a"b',
                 'https://example.com/published/%s/a"b' % slug)]:
            with self.subTest(href=href):
                self.assertEqual(self.render_link(href, slug=slug), expected)

    def test_token_cannot_inject_download_link_attributes(self):
        token = "token'onmouseover='alert(1)'x='"
        self.assertEqual(
            self.render_link('https://example.com/lib/repo-id/file/a"b.pdf', token=token),
            'https://example.com/d/%s/files/?p=a"b.pdf&dl=1' % token)

    def test_normal_links_still_work(self):
        for href, expected in [
                ('https://example.com/lib/repo-id/file/docs/page.md',
                 'https://example.com/published/test-wiki/docs/page.md'),
                ('https://example.com/lib/repo-id/file/docs/file.pdf',
                 'https://example.com/d/share-token/files/?p=docs/file.pdf&dl=1'),
                ('https://example.com/library/repo-id/name/docs',
                 'https://example.com/published/test-wiki/docs')]:
            with self.subTest(href=href):
                self.assertEqual(self.render_link(href), expected)
