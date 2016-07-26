# Copyright (c) 2012-2016 Seafile Ltd.
"""
This file demonstrates two different styles of tests (one doctest and one
unittest). These will both pass when you run "manage.py test".

Replace these with more appropriate tests for your application.
"""

from django.utils import unittest
from django.test.client import Client, RequestFactory
from django.test import TestCase

from seahub.base.accounts import User

class BaseTestCase(TestCase):
    """
    Helper base class for all the follow test cases.
    """
    def setUp(self):
        self.user = User.objects.create_superuser('admin@admin.com', 'testpassword')

    def tearDown(self):
        self.user.delete()
    
class BasicTest(BaseTestCase):

    def login(self):
        response = self.client.post('/accounts/login/', {
                'username': 'admin@admin.com',
                'password': 'testpassword',
                })
        self.assertEqual(response.status_code, 302)
    
    def test_my_home(self):
        self.login()
        r = self.client.get('/home/my/')

        # Check that response is 200 OK
        self.assertEqual(r.status_code, 200)

        self.assertEqual(len(r.context['owned_repos']), 0)
        self.assertEqual(len(r.context['in_repos']), 0)

    def test_useradmin(self):
        self.login()
        r = self.client.get('/sys/useradmin/')

        # Check that response is 200 OK
        self.assertEqual(r.status_code, 200)

    def test_notificationadmin(self):
        self.login()
        r = self.client.get('/sys/notificationadmin/')

        # Check that response is 200 OK
        self.assertEqual(r.status_code, 200)

        self.assertEqual(len(r.context['notes']), 0)
