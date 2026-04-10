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

from seahub.settings import (
    WIKI_SSR_SERVER_URL,
    WIKI_SSR_INTERNAL_SECRET,
    SEADOC_SERVER_URL,
)
from seahub.utils import get_service_url

logger = logging.getLogger(__name__)

# Timeout (seconds) waiting for the SSR service to respond.
SSR_TIMEOUT = 20


def _ssr_url(publish_url: str, page_id: str | None) -> str:
    """Build the internal Next.js SSR endpoint URL."""
    base = WIKI_SSR_SERVER_URL.rstrip('/')
    if page_id:
        return f"{base}/wiki/publish/{publish_url}/{page_id}"
    return f"{base}/wiki/publish/{publish_url}"


def proxy_to_ssr(request, wiki, publish_url: str, page_id: str | None) -> HttpResponse | None:
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

    headers = {
        'X-Wiki-SSR-Secret':    WIKI_SSR_INTERNAL_SECRET,
        'X-Wiki-Id':            wiki.id,          # UUID of the wiki repo
        'X-Repo-Name':          wiki.name or '',
        'X-Seahub-Service-URL': get_service_url(),
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
