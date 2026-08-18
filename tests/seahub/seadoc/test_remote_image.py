import io
import socket
from unittest import TestCase
from unittest.mock import MagicMock, patch

from seahub.seadoc import remote_image
from seahub.seadoc.remote_image import RemoteImageError


class FakeResponse:
    def __init__(self, status=200, headers=None, content=b''):
        self.status = status
        self.headers = headers or {}
        self.content = io.BytesIO(content)

    def getheader(self, name):
        return self.headers.get(name)

    def read(self, size):
        return self.content.read(size)


class RemoteImageTest(TestCase):
    def test_allows_only_configured_https_hosts(self):
        parsed_url = remote_image.validate_remote_image_url(
            'https://mmbiz.qpic.cn/path/image.png'
        )
        self.assertEqual(parsed_url.hostname, 'mmbiz.qpic.cn')
        parsed_url = remote_image.validate_remote_image_url(
            'https://res.wx.qq.com/path/image.png'
        )
        self.assertEqual(parsed_url.hostname, 'res.wx.qq.com')

        invalid_urls = (
            'http://mmbiz.qpic.cn/path/image.png',
            'https://mmbiz.qpic.cn.evil.example/path/image.png',
            'https://user:password@mmbiz.qpic.cn/path/image.png',
            'https://mmbiz.qpic.cn:8443/path/image.png',
            'https://127.0.0.1/path/image.png',
        )
        for url in invalid_urls:
            with self.subTest(url=url), self.assertRaises(RemoteImageError):
                remote_image.validate_remote_image_url(url)

    def test_allows_only_public_ip_addresses(self):
        private_addresses = (
            '127.0.0.1',
            '10.0.0.1',
            '172.16.0.1',
            '192.168.1.1',
            '169.254.1.1',
            '::1',
            'fc00::1',
            'fe80::1',
            '::ffff:127.0.0.1',
            '2001:db8::1',
            '224.0.0.1',
            'ff02::1',
        )
        for address in private_addresses:
            with self.subTest(address=address):
                self.assertFalse(remote_image.is_public_address(address))
        self.assertTrue(remote_image.is_public_address('1.1.1.1'))
        self.assertTrue(remote_image.is_public_address('2606:4700:4700::1111'))

    @patch('seahub.seadoc.remote_image.socket.getaddrinfo')
    def test_rejects_host_if_any_dns_result_is_not_public(self, mock_getaddrinfo):
        mock_getaddrinfo.return_value = [
            (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, '', ('1.1.1.1', 443)),
            (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, '', ('127.0.0.1', 443)),
        ]

        with self.assertRaises(RemoteImageError) as context:
            remote_image.resolve_public_addresses('mmbiz.qpic.cn')

        self.assertEqual(context.exception.code, 'private_address')

    @patch('seahub.seadoc.remote_image._PinnedHTTPSConnection')
    @patch('seahub.seadoc.remote_image.resolve_public_addresses')
    def test_connects_to_validated_ip_with_original_hostname(
            self, mock_resolve, mock_connection_class):
        mock_resolve.return_value = ['1.1.1.1']
        connection = mock_connection_class.return_value
        connection.getresponse.return_value = FakeResponse()
        parsed_url = remote_image.validate_remote_image_url(
            'https://mmbiz.qpic.cn/path/image.png?wx_fmt=png'
        )

        result_connection, _ = remote_image._open_https_response(parsed_url)

        self.assertEqual(result_connection, connection)
        mock_connection_class.assert_called_once_with(
            '1.1.1.1',
            'mmbiz.qpic.cn',
            remote_image._DOWNLOAD_TIMEOUT,
        )
        connection.request.assert_called_once()
        request_args = connection.request.call_args
        self.assertEqual(request_args.args[:2], ('GET', '/path/image.png?wx_fmt=png'))
        self.assertEqual(request_args.kwargs['headers']['Host'], 'mmbiz.qpic.cn')

    def test_detects_image_type_from_file_signature(self):
        self.assertEqual(
            remote_image.detect_image_type(b'\xff\xd8\xff' + b'0' * 9),
            {'extension': 'jpg', 'content_type': 'image/jpeg'},
        )
        self.assertEqual(
            remote_image.detect_image_type(b'\x89PNG\r\n\x1a\n' + b'0' * 4),
            {'extension': 'png', 'content_type': 'image/png'},
        )
        self.assertEqual(
            remote_image.detect_image_type(b'GIF89a' + b'0' * 6),
            {'extension': 'gif', 'content_type': 'image/gif'},
        )
        self.assertIsNone(remote_image.detect_image_type(b'not-an-image'))

    @patch('seahub.seadoc.remote_image._open_https_response')
    def test_download_validates_signature_instead_of_content_type(self, mock_open):
        content = b'\xff\xd8\xff' + b'0' * 9
        connection = MagicMock()
        mock_open.return_value = (
            connection,
            FakeResponse(headers={'Content-Type': 'text/html'}, content=content),
        )

        image = remote_image.download_remote_image(
            'https://mmbiz.qpic.cn/path/image'
        )

        self.assertEqual(image['content'], content)
        self.assertEqual(image['extension'], 'jpg')
        connection.close.assert_called_once_with()

    @patch('seahub.seadoc.remote_image._open_https_response')
    def test_rejects_redirect_to_unconfigured_host(self, mock_open):
        connection = MagicMock()
        mock_open.return_value = (
            connection,
            FakeResponse(status=302, headers={'Location': 'https://example.com/image.jpg'}),
        )

        with self.assertRaises(RemoteImageError) as context:
            remote_image.download_remote_image(
                'https://mmbiz.qpic.cn/path/image'
            )

        self.assertEqual(context.exception.code, 'host_not_allowed')
        connection.close.assert_called_once_with()

    @patch.object(remote_image, 'MAX_REMOTE_IMAGE_SIZE', 10)
    def test_rejects_streamed_content_over_size_limit(self):
        response = FakeResponse(content=b'0' * 11)

        with self.assertRaises(RemoteImageError) as context:
            remote_image._read_response_content(response)

        self.assertEqual(context.exception.code, 'image_too_large')

    @patch('seahub.seadoc.remote_image._download_once')
    def test_retries_transient_download_failure(self, mock_download):
        expected = {'content': b'image'}
        mock_download.side_effect = [
            RemoteImageError('download_failed', 'Failed.', True),
            expected,
        ]

        result = remote_image.download_remote_image(
            'https://mmbiz.qpic.cn/path/image'
        )

        self.assertEqual(result, expected)
        self.assertEqual(mock_download.call_count, 2)
