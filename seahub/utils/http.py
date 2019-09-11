# Copyright (c) 2012-2016 Seafile Ltd.


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

JSON_CONTENT_TYPE = 'application/json; charset=utf-8'
def json_response(func):
    @wraps(func)
    def wrapped(*a, **kw):
        try:
            result = func(*a, **kw)
        except BadRequestException as e:
            return HttpResponseBadRequest(e.message)
        except RequestForbbiddenException as e:
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
