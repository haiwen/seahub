# Copyright (c) 2012-2016 Seafile Ltd.

import time
import json
from functools import wraps
from django.core.cache import cache
from django.http import HttpResponse, HttpResponseBadRequest, \
        HttpResponseForbidden

from seahub.settings import REQUEST_RATE_LIMIT_NUMBER, \
        REQUEST_RATE_LIMIT_PERIOD

JSON_CONTENT_TYPE = 'application/json; charset=utf-8'


class _HTTPException(Exception):
    def __init__(self, message=''):
        self.message = message

    def __str__(self):
        return '%s: %s' % (self.__class__.__name__, self.message)


class BadRequestException(_HTTPException):
    pass


class RequestForbbiddenException(_HTTPException):
    pass


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


def rate_limit(number=REQUEST_RATE_LIMIT_NUMBER,
               period=REQUEST_RATE_LIMIT_PERIOD):
    """
    :param number: number of requests
    :param period: second
    """
    def decorator(func):

        @wraps(func)
        def wrapped(request, *args, **kwargs):

            if REQUEST_RATE_LIMIT_NUMBER > 0 and \
                    REQUEST_RATE_LIMIT_PERIOD > 0:

                ip = request.META.get('REMOTE_ADDR')
                cache_key = f"rate_limit:{ip}"

                current_time = time.time()
                data = cache.get(cache_key, {'count': 0, 'start_time': current_time})
                if current_time - data['start_time'] > period:
                    data = {'count': 1, 'start_time': current_time}
                else:
                    data['count'] += 1

                cache.set(cache_key, data, timeout=period)

                if data['count'] > number:
                    return HttpResponse("Too many requests", status=429)

            return func(request, *args, **kwargs)
        return wrapped
    return decorator


def check_request_over_limit_by_ip(request, number, interval, cache_key_prefix='rate_limit'):
    '''

    :param request: http_request
    :param number:  number of requests
    :param interval:  within secconds
    :param cache_key_prefix:  custom the cache for client_ip
    :return:
    '''
    
    client_ip = request.META.get('REMOTE_ADDR')
    cache_key = f'{cache_key_prefix}:{client_ip}'
    current_time = time.time()
    data = cache.get(cache_key, {'count': 0, 'start_time': current_time})
    
    if current_time - data['start_time'] > interval:
        data = {'count': 1, 'start_time': current_time}
    else:
        data['count'] += 1
    
    cache.set(cache_key, data, timeout=interval)
    if data['count'] > number:
        return True
    
    return False
