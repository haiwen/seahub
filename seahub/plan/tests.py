# Copyright (c) 2012-2016 Seafile Ltd.
"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""

from django.conf import settings
from django.test import RequestFactory
import unittest
from django.contrib.sessions.middleware import SessionMiddleware
from django.contrib.auth.middleware import AuthenticationMiddleware

from .middleware import PlanMiddleware

PLAN = {
    'Free': {
        'num_of_groups': 3,
        'group_members': 6,
        },
    'A': {
        'num_of_groups': 8,
        'group_members': 16,
        },
    'B': {
        'num_of_groups': -1,    # no limit
        'group_members': -1,    # no limit
        },
}

class PlanMiddlewareTests(unittest.TestCase):
    def setUp(self):
        setattr(settings, "CLOUD_MODE", True)
        setattr(settings, "PLAN", PLAN)

    def tearDown(self):
        pass
        
    def test_free_plan(self):
        request = RequestFactory().get('/')

        session_middleware = SessionMiddleware()
        auth_middleware = AuthenticationMiddleware()
        plan_middleware = PlanMiddleware()

        session_middleware.process_request(request)
        auth_middleware.process_request(request)
        plan_middleware.process_request(request)

        print(request.user.num_of_groups)

        assert False, "todo"
