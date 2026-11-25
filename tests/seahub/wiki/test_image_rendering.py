import unittest
from unittest.mock import patch

from lxml import html

from seahub.wiki import views


class WikiImageRenderingTest(unittest.TestCase):
    def render(self, content, file_path='/docs/page.md', slug='test-wiki'):
        with patch.object(views, 'get_service_url', return_value='https://example.com'):
            result, title, outlines, error = views.format_markdown_file_content(
                slug, 'repo-id', file_path, 'share-token', content)
        self.assertIsNone(error)
        return html.fragment_fromstring(str(result), create_parent='div')

    def test_directory_name_cannot_inject_image_attributes(self):
        for src in ['./image.png', '../image.png']:
            with self.subTest(src=src):
                directory = '/docs/" onerror="alert(1)" data-x="'
                file_path = directory + ('/nested/page.md' if src.startswith('../') else '/page.md')
                doc = self.render('![image](%s)' % src, file_path=file_path)
                image = doc.xpath('.//img')[0]
                self.assertEqual(set(image.attrib), {'src', 'alt'})
                self.assertEqual(image.get('src'),
                                 'https://example.com/view-image-via-public-wiki/'
                                 '?slug=test-wiki&path=' + directory + '/image.png')

    def test_slug_cannot_inject_image_attributes(self):
        for src in ['./image.png', 'https://example.com/lib/repo-id/file/image.png?raw=1']:
            with self.subTest(src=src):
                doc = self.render('![image](%s)' % src,
                                  slug='wiki" onerror="alert(1)" data-x="')
                self.assertEqual(set(doc.xpath('.//img')[0].attrib), {'src', 'alt'})

    def test_normal_image_urls_still_work(self):
        for src, path in [('./image.png', '/docs/image.png'),
                          ("./it's.png", "/docs/it's.png"),
                          ('../image.png', '/image.png'),
                          ('https://example.com/lib/repo-id/file/image.png?raw=1', '/image.png')]:
            with self.subTest(src=src):
                doc = self.render('![image](%s)' % src)
                self.assertEqual(doc.xpath('.//img')[0].get('src'),
                                 'https://example.com/view-image-via-public-wiki/'
                                 '?slug=test-wiki&path=' + path)
