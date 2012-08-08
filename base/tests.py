"""
This file demonstrates two different styles of tests (one doctest and one
unittest). These will both pass when you run "manage.py test".

Replace these with more appropriate tests for your application.
"""

from django.utils import unittest
from django.test.client import Client, RequestFactory
from django.test import TestCase

from auth.models import AnonymousUser

from seahub.base.accounts import User
from seahub.views import myhome

class BaseTestCase(TestCase):
    """
    Helper base class for all the follow test cases.
    """
    def setUp(self):
        self.user = User.objects.create_user('lennon@thebeatles.com', 'testpassword', is_active=True)
        self.user.save()

    def tearDown(self):
        self.user.delete()
    
class SimpleTest(BaseTestCase):
    """
    Use TestClient to do integration testing (ie: entire user checkout process
    in shop which includes many steps) and RequestFactory to test independent
    view functions behavior and their output (ie. adding product to cart).    
    """

    def login(self):
        response = self.client.post('/accounts/login/', {
                'username': 'lennon@thebeatles.com',
                'password': 'testpassword',
                })
        self.assertEqual(response.status_code, 302)
    
    def test_details(self):
        self.login()
        r = self.client.get('/home/my/')

        # Check that response is 200 OK
        self.assertEqual(r.status_code, 200)

        self.assertEqual(len(r.context['owned_repos']), 0)
        self.assertEqual(len(r.context['in_repos']), 0)

