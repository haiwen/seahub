# seahub/wiki2/ssr_proxy.py
#
# Handles proxying wiki publish requests to the Next.js SSR service.
#
# The proxy:
#   1. Forwards the request to wiki-ssr with internal auth headers.
#   2. Streams the SSR'd HTML back to the original caller.
#   3. Falls back to the normal Django template render on any error,
#      so the site stays up even if wiki-ssr is down.

import logging
import requests

from django.http import HttpResponse

from seaserv import seafile_api
from seahub.settings import (
    SEADOC_SERVER_URL,
    WIKI_SSR_SERVER_URL, WIKI_SSR_INTERNAL_SECRET,
    SITE_ROOT, MEDIA_URL, FILE_SERVER_ROOT,
    ENABLE_THUMBNAIL_SERVER,
    THUMBNAIL_DEFAULT_SIZE, THUMBNAIL_SIZE_FOR_ORIGINAL,
)
from seahub.utils import get_service_url
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.views import get_seadoc_file_uuid

logger = logging.getLogger(__name__)

# Timeout (seconds) waiting for the SSR service to respond.
SSR_TIMEOUT = 20


def _ssr_url(publish_url: str, page_id: str | None) -> str:
    """Build the internal Next.js SSR endpoint URL."""
    base = WIKI_SSR_SERVER_URL.rstrip('/')
    if page_id:
        return f"{base}/wiki/publish/{publish_url}/{page_id}"
    return f"{base}/wiki/publish/{publish_url}"


def proxy_to_ssr(request, wiki, publish_url: str,
                 page_id: str, file_path: str) -> HttpResponse | None:
    """
    Forward the incoming request to the Next.js SSR service and return its
    response as a Django HttpResponse.

    Returns None if the proxy fails, so the caller can fall back to the
    normal template render.

    Headers forwarded to Next.js:
        X-Wiki-SSR-Secret    — shared secret (auth)
        X-Wiki-Id            — wiki UUID, saves an extra DB lookup in Next.js
        X-Repo-Name          — human-readable wiki name
        X-Seahub-Service-URL — public service URL (for generating links)
        X-Forwarded-For      — original client IP (for logging)
    """
    if not WIKI_SSR_SERVER_URL:
        return None

    target_url = _ssr_url(publish_url, page_id)
    print(target_url)

    username = request.user.username
    avatar_url, _, _ = api_avatar_url(username)
    repo = seafile_api.get_repo(wiki.repo_id)
    file_uuid = get_seadoc_file_uuid(repo, file_path)
    headers = {
        'X-Seadoc-Server-Url': SEADOC_SERVER_URL,
        'X-Seahub-Service-URL': get_service_url(),
        'X-Wiki-SSR-Secret': WIKI_SSR_INTERNAL_SECRET,
        'X-Site-Root': SITE_ROOT,
        'X-Media-Url': MEDIA_URL,
        'X-Thumbnail-Default-Size': str(THUMBNAIL_DEFAULT_SIZE),
        'X-File-Server-Root': FILE_SERVER_ROOT,
        'X-Thumbnail-Size-For-Original': str(THUMBNAIL_SIZE_FOR_ORIGINAL),
        'X-Enable-Thumbnail-Server': str(ENABLE_THUMBNAIL_SERVER),

        'X-Wiki-Id': wiki.id,
        'X-Repo-Name': wiki.name or '',
        'X-Assets-Url': f'/api/v2.1/seadoc/download-image/{file_uuid}/',
        'X-Name': email2nickname(username),
        'X-Username': username,
        'X-Avatar-Url': avatar_url,
        'X-Lang': request.LANGUAGE_CODE,

        # Forward original client IP so Next.js can log it
        'X-Forwarded-For':      _get_client_ip(request),
        'Accept':               'text/html',
        'Accept-Language':      request.META.get('HTTP_ACCEPT_LANGUAGE', ''),
        'User-Agent':           'seahub-ssr-proxy/1.0',
    }

    try:
        resp = requests.get(
            target_url,
            headers=headers,
            timeout=SSR_TIMEOUT,
            allow_redirects=False,
            stream=True,
        )

        if resp.status_code == 404:
            from django.http import Http404
            raise Http404

        if not resp.ok:
            logger.warning(
                '[ssr_proxy] SSR service returned %s for %s',
                resp.status_code, target_url,
            )
            return None

        # Stream HTML back to the client
        content_type = resp.headers.get('Content-Type', 'text/html; charset=utf-8')
        django_resp = HttpResponse(
            resp.content,
            content_type=content_type,
            status=resp.status_code,
        )

        # Forward a small set of useful headers
        for header in ('X-Content-Type-Options', 'Cache-Control'):
            if header in resp.headers:
                django_resp[header] = resp.headers[header]

        return django_resp

    except requests.exceptions.Timeout:
        logger.warning('[ssr_proxy] Timeout contacting SSR service at %s', target_url)
    except requests.exceptions.ConnectionError:
        logger.warning('[ssr_proxy] Cannot connect to SSR service at %s', target_url)
    except Exception as e:
        logger.exception('[ssr_proxy] Unexpected error: %s', e)

    return None


def _get_client_ip(request) -> str:
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')
