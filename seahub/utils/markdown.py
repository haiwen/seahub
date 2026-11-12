from html.parser import HTMLParser
from urllib.parse import parse_qs, unquote, urlsplit

import markdown


class MarkdownImageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.image_urls = []

    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            self.image_urls.extend(value for name, value in attrs
                                   if name == 'src' and value)


def markdown_contains_image(file_content, image_url):
    parser = MarkdownImageParser()
    parser.feed(markdown.markdown(file_content, extensions=['extra']))
    expected_url = urlsplit(image_url)
    expected_url = expected_url._replace(path=unquote(expected_url.path), query='', fragment='')
    for src in parser.image_urls:
        try:
            parsed_url = urlsplit(src)
        except ValueError:
            continue
        if parse_qs(parsed_url.query).get('raw') != ['1']:
            continue
        if parsed_url._replace(path=unquote(parsed_url.path), query='', fragment='') == expected_url:
            return True
    return False
