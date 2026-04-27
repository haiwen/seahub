# Copyright (c) 2012-2016 Seafile Ltd.
from django.test import SimpleTestCase, RequestFactory
from django.http import HttpResponse

from seahub.two_factor.gateways.twilio.middleware import (
    ThreadLocals,
    get_current_request,
)


def dummy_get_response(request):
    return HttpResponse('OK')


class ThreadLocalsMiddlewareTest(SimpleTestCase):

    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = ThreadLocals(dummy_get_response)

    def test_stores_request_in_thread_locals(self):
        request = self.factory.get('/')
        self.middleware(request)
        self.assertIs(get_current_request(), request)

    def test_returns_response_from_get_response(self):
        request = self.factory.get('/')
        response = self.middleware(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'OK')

    def test_request_is_updated_on_each_call(self):
        req1 = self.factory.get('/first/')
        req2 = self.factory.get('/second/')

        self.middleware(req1)
        self.assertIs(get_current_request(), req1)

        self.middleware(req2)
        self.assertIs(get_current_request(), req2)

    def test_get_current_request_returns_none_before_any_call(self):
        # In a fresh thread, _thread_locals has no request and should return None.
        import threading
        result = []

        def check_in_thread():
            result.append(get_current_request())

        t = threading.Thread(target=check_in_thread)
        t.start()
        t.join()
        self.assertIsNone(result[0])
