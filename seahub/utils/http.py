"""Copied from latest django/utils/http.py::is_safe_url
"""
from __future__ import unicode_literals

import unicodedata
import urlparse
import json

from functools import wraps
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden

class _HTTPException(Exception):
    def __init__(self, message=''):
        self.message = message

    def __str__(self):
        return '%s: %s' % (self.__class__.__name__, self.message)

class BadRequestException(_HTTPException):
    pass

class RequestForbbiddenException(_HTTPException):
    pass

def is_safe_url(url, host=None):
    """
    Return ``True`` if the url is a safe redirection (i.e. it doesn't point to
    a different host and uses a safe scheme).

    Always returns ``False`` on an empty url.
    """
    if url is not None:
        url = url.strip()
    if not url:
        return False
    # Chrome treats \ completely as /
    url = url.replace('\\', '/')
    # Chrome considers any URL with more than two slashes to be absolute, but
    # urlparse is not so flexible. Treat any url with three slashes as unsafe.
    if url.startswith('///'):
        return False
    url_info = urlparse.urlparse(url)

    # Forbid URLs like http:///example.com - with a scheme, but without a hostname.
    # In that URL, example.com is not the hostname but, a path component. However,
    # Chrome will still consider example.com to be the hostname, so we must not
    # allow this syntax.
    if not url_info.netloc and url_info.scheme:
        return False
    # Forbid URLs that start with control characters. Some browsers (like
    # Chrome) ignore quite a few control characters at the start of a
    # URL and might consider the URL as scheme relative.
    if unicodedata.category(url[0])[0] == 'C':
        return False
    return ((not url_info.netloc or url_info.netloc == host) and
            (not url_info.scheme or url_info.scheme in ['http', 'https']))

JSON_CONTENT_TYPE = 'application/json; charset=utf-8'
def json_response(func):
    @wraps(func)
    def wrapped(*a, **kw):
        try:
            result = func(*a, **kw)
        except BadRequestException, e:
            return HttpResponseBadRequest(e.message)
        except RequestForbbiddenException, e:
            return HttpResponseForbidden(e.messages)
        if isinstance(result, HttpResponse):
            return result
        else:
            return HttpResponse(json.dumps(result), status=200,
                                content_type=JSON_CONTENT_TYPE)
    return wrapped

def int_param(request, key):
    v = request.GET.get(key, None)
    if not v:
        raise BadRequestException()
    try:
        return int(v)
    except ValueError:
        raise BadRequestException()
