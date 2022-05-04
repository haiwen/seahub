# -*- coding: utf-8 -*-

import os

from django.conf import settings
from django.utils import unittest
from django.test import TestCase
from django.test.client import RequestFactory
from django.test.client import Client

SAMPLE_HEADERS = {
  "REMOTE_USER": 'devloper@school.edu',
  "Shib-Application-ID": "default", 
  "Shib-Authentication-Method": "urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified", 
  "Shib-AuthnContext-Class": "urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified", 
  "Shib-Identity-Provider": "https://sso.college.edu/idp/shibboleth", 
  "Shib-Session-ID": "1", 
  "Shib-Session-Index": "12", 
  "Shibboleth-affiliation": "member@college.edu;staff@college.edu", 
  "Shibboleth-schoolBarCode": "12345678",
  "Shibboleth-schoolNetId": "Sample_Developer", 
  "Shibboleth-schoolStatus": "active", 
  "Shibboleth-department": "University Library, Integrated Technology Services", 
  "Shibboleth-displayName": "Sample Developer", 
  "Shibboleth-eppn": "sampledeveloper@school.edu", 
  "Shibboleth-givenName": "Sample", 
  "Shibboleth-isMemberOf": "SCHOOL:COMMUNITY:EMPLOYEE:ADMINISTRATIVE:BASE;SCHOOL:COMMUNITY:EMPLOYEE:STAFF:SAC:P;COMMUNITY:ALL;SCHOOL:COMMUNITY:EMPLOYEE:STAFF:SAC:M;", 
  "Shibboleth-mail": "Sample_Developer@school.edu", 
  "Shibboleth-persistent-id": "https://sso.college.edu/idp/shibboleth!https://server.college.edu/shibboleth-sp!sk1Z9qKruvXY7JXvsq4GRb8GCUk=", 
  "Shibboleth-sn": "Developer", 
  "Shibboleth-title": "Library Developer", 
  "Shibboleth-unscoped-affiliation": "member;staff"
}

settings.SHIBBOLETH_ATTRIBUTE_MAP = {
   "Shib-Identity-Provider": (True, "idp"),
   "Shibboleth-mail": (True, "email"),
   "Shibboleth-eppn": (True, "username"),
   "Shibboleth-schoolStatus": (True, "status"),
   "Shibboleth-affiliation": (True, "affiliation"),
   "Shib-Session-ID": (True, "session_id"),
   "Shibboleth-givenName": (True, "first_name"),
   "Shibboleth-sn": (True, "last_name"),
   "Shibboleth-mail": (True, "email"),
   "Shibboleth-schoolBarCode": (False, "barcode")
}


settings.AUTHENTICATION_BACKENDS += (
    'shibboleth.backends.ShibbolethRemoteUserBackend',
)

settings.MIDDLEWARE.append(
    'shibboleth.middleware.ShibbolethRemoteUserMiddleware',
)

settings.ROOT_URLCONF = 'shibboleth.urls'

settings.SHIBBOLETH_LOGOUT_URL = 'https://sso.school.edu/logout?next=%s'
settings.SHIBBOLETH_LOGOUT_REDIRECT_URL = 'http://school.edu/'

from shibboleth.views import ShibbolethView

def read(fname):
    return open(os.path.join(os.path.dirname(__file__), fname)).read()

class AttributesTest(unittest.TestCase):   
    def setUp(self):
        self.c = Client()
        
    def test_decorator_not_authenticated(self):
        """
        """
        resp = self.c.get('/')
        self.assertEqual(resp.status_code, 302)
        #Test the context - shouldn't exist
        self.assertEqual(resp.context, None) 
        
    def test_decorator_authenticated(self):
        """
        """
        resp = self.c.get('/', **SAMPLE_HEADERS)
        self.assertEqual(resp.status_code, 200)
        #Test the context
        user = resp.context.get('user')
        self.assertEqual(user.email, 'Sample_Developer@school.edu')
        self.assertEqual(user.first_name, 'Sample')
        self.assertEqual(user.last_name, 'Developer')
        self.assertTrue(user.is_authenticated)
        self.assertFalse(user.is_anonymous)

class LogoutTest(unittest.TestCase):   
    def setUp(self):
        self.c = Client()
             
    def test_logout(self):
        """
        """
        from shibboleth import app_settings
        #Login
        login = self.c.get('/', **SAMPLE_HEADERS)
        self.assertEqual(login.status_code, 200)
        #Logout
        logout = self.c.get('/logout/', **SAMPLE_HEADERS)
        self.assertEqual(logout.status_code, 302)
        #Ensure redirect happened.
        self.assertEqual(
            logout['Location'],
            'https://sso.school.edu/logout?next=http://school.edu/'
        )
        #Check to see if the session has the force logout key.
        self.assertTrue(self.c.session.get(app_settings.LOGOUT_SESSION_KEY))
        #Load root url to see if user is in fact logged out.
        resp = self.c.get('/', **SAMPLE_HEADERS)
        self.assertEqual(resp.status_code, 302)
        #Make sure the context is empty.
        self.assertEqual(resp.context, None)
        
