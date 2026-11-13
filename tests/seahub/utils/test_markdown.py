import unittest

from seahub.utils.markdown import markdown_contains_image


class MarkdownContainsImageTest(unittest.TestCase):
    image_url = 'https://example.com/lib/repo-id/file/images/photo.png?raw=1'

    def test_inline_image(self):
        self.assertTrue(markdown_contains_image(
            '![photo](%s)' % self.image_url, self.image_url))

    def test_reference_image(self):
        self.assertTrue(markdown_contains_image(
            '![photo][image]\n\n[image]: %s' % self.image_url, self.image_url))

    def test_html_image(self):
        self.assertTrue(markdown_contains_image(
            '<img src="%s" />' % self.image_url, self.image_url))

    def test_encoded_path_and_escaped_parentheses(self):
        image_url = self.image_url.replace('photo.png', '%E5%9B%BE%20%281%29.png')
        src = image_url.replace('%28', r'\(').replace('%29', r'\)')
        self.assertTrue(markdown_contains_image('![photo](%s)' % src, image_url))

    def test_same_name_in_another_directory(self):
        src = self.image_url.replace('/images/', '/private/')
        self.assertFalse(markdown_contains_image(
            '![photo](%s)' % src, self.image_url))

    def test_other_repo_or_site(self):
        for old, new in [('repo-id', 'other-repo'), ('example.com', 'other.example.com')]:
            with self.subTest(new=new):
                self.assertFalse(markdown_contains_image(
                    '![photo](%s)' % self.image_url.replace(old, new), self.image_url))

    def test_plain_url_and_link_are_not_images(self):
        for content in [self.image_url, '[photo](%s)' % self.image_url]:
            with self.subTest(content=content):
                self.assertFalse(markdown_contains_image(content, self.image_url))

    def test_code_is_not_an_image(self):
        image = '![photo](%s)' % self.image_url
        for content in ['`%s`' % image, '```\n%s\n```' % image]:
            with self.subTest(content=content):
                self.assertFalse(markdown_contains_image(content, self.image_url))

    def test_extra_query_and_fragment_are_allowed(self):
        for query in ['raw=1&other=1', 'raw=1#fragment', 'other=1&raw=1', 'raw=1&other=1#fragment']:
            with self.subTest(query=query):
                src = self.image_url.split('?')[0] + '?' + query
                self.assertTrue(markdown_contains_image('![photo](%s)' % src, self.image_url))

    def test_raw_parameter_is_required_and_unambiguous(self):
        for query in ['', 'raw=0', 'raw=10', 'other=1', 'raw=1&raw=0', 'raw=1&raw=1']:
            with self.subTest(query=query):
                src = self.image_url.split('?')[0] + '?' + query
                self.assertFalse(markdown_contains_image(
                    '![photo](%s)' % src, self.image_url))

    def test_extra_query_cannot_authorize_another_path(self):
        src = self.image_url.replace('/images/', '/private/') + '&other=1#fragment'
        self.assertFalse(markdown_contains_image('![photo](%s)' % src, self.image_url))

    def test_malformed_url_is_ignored(self):
        self.assertFalse(markdown_contains_image('![photo](https://[invalid/)', self.image_url))
