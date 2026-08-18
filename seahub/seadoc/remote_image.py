import http.client
import ipaddress
import socket
import ssl
import threading
from urllib.parse import urljoin, urlsplit


MAX_REMOTE_IMAGE_SIZE = 10 * 1024 * 1024
MAX_REMOTE_IMAGE_COUNT = 10

_MAX_URL_LENGTH = 4096
_MAX_REDIRECTS = 3
_DOWNLOAD_TIMEOUT = 15
_DOWNLOAD_ATTEMPTS = 2
_READ_CHUNK_SIZE = 64 * 1024
_MAX_PROCESS_TRANSFERS = 4
_MAX_QUEUED_TRANSFERS = 40
_REDIRECT_STATUSES = frozenset((301, 302, 303, 307, 308))
_ALLOWED_IMAGE_HOSTS = frozenset((
    'mmbiz.qpic.cn',
    'res.wx.qq.com',
    'wx.qlogo.cn',
))

_active_transfer_slots = threading.BoundedSemaphore(_MAX_PROCESS_TRANSFERS)
_pending_transfer_slots = threading.BoundedSemaphore(
    _MAX_PROCESS_TRANSFERS + _MAX_QUEUED_TRANSFERS
)


class RemoteImageError(Exception):
    def __init__(self, code, message, retryable=False):
        super().__init__(message)
        self.code = code
        self.retryable = retryable


def validate_remote_image_url(value):
    if not isinstance(value, str) or not value or len(value) > _MAX_URL_LENGTH:
        raise RemoteImageError('invalid_url', 'Image URL is invalid.')

    try:
        parsed_url = urlsplit(value.strip())
        hostname = parsed_url.hostname.lower() if parsed_url.hostname else ''
        port = parsed_url.port
    except (AttributeError, ValueError):
        raise RemoteImageError('invalid_url', 'Image URL is invalid.')

    if (
        parsed_url.scheme.lower() != 'https'
        or parsed_url.username
        or parsed_url.password
        or port not in (None, 443)
    ):
        raise RemoteImageError('invalid_url', 'Only HTTPS image URLs are allowed.')

    if hostname not in _ALLOWED_IMAGE_HOSTS:
        raise RemoteImageError('host_not_allowed', 'Image host is not allowed.')

    return parsed_url


def is_public_address(address):
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False

    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return (
        ip.is_global
        and not ip.is_multicast
        and not ip.is_reserved
        and not ip.is_unspecified
    )


def resolve_public_addresses(hostname):
    try:
        address_info = socket.getaddrinfo(
            hostname,
            443,
            type=socket.SOCK_STREAM,
            proto=socket.IPPROTO_TCP,
        )
    except socket.gaierror:
        raise RemoteImageError('download_failed', 'Image host could not be resolved.', True)

    addresses = []
    for item in address_info:
        address = item[4][0]
        if address not in addresses:
            addresses.append(address)

    if not addresses:
        raise RemoteImageError('download_failed', 'Image host could not be resolved.', True)
    if any(not is_public_address(address) for address in addresses):
        raise RemoteImageError(
            'private_address',
            'Image host resolved to a disallowed address.',
        )
    return addresses


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, address, server_hostname, timeout):
        super().__init__(
            address,
            port=443,
            timeout=timeout,
            context=ssl.create_default_context(),
        )
        self._server_hostname = server_hostname

    def connect(self):
        self.sock = self._create_connection(
            (self.host, self.port),
            self.timeout,
            self.source_address,
        )
        self.sock = self._context.wrap_socket(
            self.sock,
            server_hostname=self._server_hostname,
        )


def _request_target(parsed_url):
    target = parsed_url.path or '/'
    if parsed_url.query:
        target += '?' + parsed_url.query
    try:
        target.encode('ascii')
    except UnicodeEncodeError:
        raise RemoteImageError('invalid_url', 'Image URL is invalid.')
    return target


def _open_https_response(parsed_url):
    hostname = parsed_url.hostname.lower()
    addresses = resolve_public_addresses(hostname)
    last_error = None

    for address in addresses:
        connection = _PinnedHTTPSConnection(address, hostname, _DOWNLOAD_TIMEOUT)
        try:
            connection.request('GET', _request_target(parsed_url), headers={
                'Accept': 'image/*',
                'Accept-Encoding': 'identity',
                'Connection': 'close',
                'Host': hostname,
                'User-Agent': 'Seahub remote image importer',
            })
            return connection, connection.getresponse()
        except (OSError, http.client.HTTPException) as error:
            last_error = error
            connection.close()

    raise RemoteImageError('download_failed', 'Image download failed.', True) from last_error


def detect_image_type(content):
    if not isinstance(content, bytes) or len(content) < 12:
        return None

    if content[:3] == b'\xff\xd8\xff':
        return {'extension': 'jpg', 'content_type': 'image/jpeg'}
    if content[:8] == b'\x89PNG\r\n\x1a\n':
        return {'extension': 'png', 'content_type': 'image/png'}
    if content[:6] in (b'GIF87a', b'GIF89a'):
        return {'extension': 'gif', 'content_type': 'image/gif'}
    if content[:4] == b'RIFF' and content[8:12] == b'WEBP':
        return {'extension': 'webp', 'content_type': 'image/webp'}
    if content[:2] == b'BM':
        return {'extension': 'bmp', 'content_type': 'image/bmp'}
    if content[:4] in (b'II*\x00', b'MM\x00*'):
        return {'extension': 'tiff', 'content_type': 'image/tiff'}
    if content[:4] == b'\x00\x00\x01\x00':
        return {'extension': 'ico', 'content_type': 'image/x-icon'}

    if content[4:8] == b'ftyp':
        brand = content[8:12]
        if brand in (b'avif', b'avis'):
            return {'extension': 'avif', 'content_type': 'image/avif'}
        if brand in (b'heic', b'heix', b'hevc', b'hevx', b'mif1', b'msf1'):
            return {'extension': 'heic', 'content_type': 'image/heic'}

    return None


def _read_response_content(response):
    content_length = response.getheader('Content-Length')
    if content_length:
        try:
            if int(content_length) > MAX_REMOTE_IMAGE_SIZE:
                raise RemoteImageError('image_too_large', 'Image exceeds the size limit.')
        except ValueError:
            pass

    content = bytearray()
    while True:
        read_size = min(
            _READ_CHUNK_SIZE,
            MAX_REMOTE_IMAGE_SIZE - len(content) + 1,
        )
        chunk = response.read(read_size)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) > MAX_REMOTE_IMAGE_SIZE:
            raise RemoteImageError('image_too_large', 'Image exceeds the size limit.')
    return bytes(content)


def _download_once(source_url):
    current_url = validate_remote_image_url(source_url)

    for redirect_count in range(_MAX_REDIRECTS + 1):
        connection, response = _open_https_response(current_url)
        try:
            if response.status in _REDIRECT_STATUSES:
                location = response.getheader('Location')
                if not location:
                    raise RemoteImageError(
                        'download_failed',
                        'Image redirect has no target.',
                    )
                if redirect_count == _MAX_REDIRECTS:
                    raise RemoteImageError(
                        'too_many_redirects',
                        'Image has too many redirects.',
                    )
                current_url = validate_remote_image_url(
                    urljoin(current_url.geturl(), location)
                )
                continue

            if not 200 <= response.status < 300:
                retryable = response.status == 429 or response.status >= 500
                raise RemoteImageError(
                    'download_failed',
                    'Image download failed.',
                    retryable,
                )

            content = _read_response_content(response)
        finally:
            connection.close()

        image_type = detect_image_type(content)
        if not image_type:
            raise RemoteImageError(
                'unsupported_image',
                'Downloaded content is not a supported image.',
            )

        return {
            'content': content,
            'final_url': current_url.geturl(),
            **image_type,
        }

    raise RemoteImageError('download_failed', 'Image download failed.')


def download_remote_image(source_url):
    last_error = None
    for attempt in range(_DOWNLOAD_ATTEMPTS):
        try:
            return _download_once(source_url)
        except RemoteImageError as error:
            last_error = error
        except (OSError, http.client.HTTPException) as error:
            last_error = RemoteImageError(
                'download_failed',
                'Image download failed.',
                True,
            )
            last_error.__cause__ = error

        if not last_error.retryable or attempt == _DOWNLOAD_ATTEMPTS - 1:
            raise last_error

    raise last_error


def run_remote_image_transfer(task):
    if not _pending_transfer_slots.acquire(blocking=False):
        raise RemoteImageError(
            'server_busy',
            'Remote image service is busy.',
            True,
        )

    try:
        if not _active_transfer_slots.acquire(timeout=_DOWNLOAD_TIMEOUT):
            raise RemoteImageError(
                'server_busy',
                'Remote image service is busy.',
                True,
            )
        try:
            return task()
        finally:
            _active_transfer_slots.release()
    finally:
        _pending_transfer_slots.release()
