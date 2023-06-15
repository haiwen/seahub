import os
import pytest

from mock import patch
from django.conf import settings
from django.test import RequestFactory, override_settings

from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from shibboleth import backends
from shibboleth.middleware import ShibbolethRemoteUserMiddleware
import importlib

TRAVIS = 'TRAVIS' in os.environ

settings.AUTHENTICATION_BACKENDS += (
    'shibboleth.backends.ShibbolethRemoteUserBackend',
)

settings.MIDDLEWARE.append(
    'shibboleth.middleware.ShibbolethRemoteUserMiddleware',
)


class ShibbolethRemoteUserMiddlewareTest(BaseTestCase):

    def get_response(req):
        from django.http import HttpResponse
        response = HttpResponse()
        return response

    def setUp(self):
        self.remove_user('sampledeveloper@school.edu')

        self.middleware = ShibbolethRemoteUserMiddleware(self.get_response)
        self.factory = RequestFactory()
        # Create an instance of a GET request.
        self.request = self.factory.get('/sso/')

        self.request.user = self.user
        # self.request.user.is_authenticated = lambda: False
        self.request.cloud_mode = False
        self.request.session = self.client.session

        self.request.META = {}
        self.request.META['Shibboleth-eppn'] = 'sampledeveloper@school.edu'
        self.request.META['REMOTE_USER'] = 'sampledeveloper@school.edu'
        self.request.META['givenname'] = 'test_gname'
        self.request.META['surname'] = 'test_sname'
        self.request.META['Shibboleth-displayName'] = 'Sample Developer'
        self.request.META['Shibboleth-affiliation'] = 'employee@school.edu;member@school.edu;faculty@school.edu;staff@school.edu'

        # default settings
        assert getattr(settings, 'SHIB_ACTIVATE_AFTER_CREATION', True) is True

    @patch('shibboleth.middleware.SHIB_ATTRIBUTE_MAP', {
        "Shibboleth-eppn": (True, "username"),
        "givenname": (False, "givenname"),
        "surname": (False, "surname"),
        "emailaddress": (False, "contact_email"),
        "organization": (False, "institution"),
        "Shibboleth-displayName": (False, "display_name"),
    })
    def test_can_process(self):
        assert len(Profile.objects.all()) == 0

        self.middleware.process_request(self.request)
        assert self.request.user.username == 'sampledeveloper@school.edu'

        assert len(Profile.objects.all()) == 1
        assert self.request.shib_login is True
        assert Profile.objects.all()[0].user == 'sampledeveloper@school.edu'
        assert Profile.objects.all()[0].nickname == 'Sample Developer'

    @override_settings(SHIBBOLETH_AFFILIATION_ROLE_MAP={
        'employee@school.edu': 'staff',
        'member@school.edu': 'staff',
        'student@school.edu': 'student',
    })
    @patch('shibboleth.middleware.SHIB_ATTRIBUTE_MAP', {
        "Shibboleth-eppn": (True, "username"),
        "givenname": (False, "givenname"),
        "surname": (False, "surname"),
        "emailaddress": (False, "contact_email"),
        "organization": (False, "institution"),
        "Shibboleth-affiliation": (False, "affiliation"),
        "Shibboleth-displayName": (False, "display_name"),
    })
    def test_can_process_user_role(self):
        assert len(Profile.objects.all()) == 0

        self.middleware.process_request(self.request)
        assert self.request.user.username == 'sampledeveloper@school.edu'

        assert len(Profile.objects.all()) == 1
        assert self.request.shib_login is True
        assert Profile.objects.all()[0].user == 'sampledeveloper@school.edu'
        assert Profile.objects.all()[0].nickname == 'Sample Developer'
        assert User.objects.get(self.request.user.username).role == 'staff'

    @pytest.mark.skipif(TRAVIS, reason="TODO: this test can only be run seperately due to the url module init in django, we may need to reload url conf: https://gist.github.com/anentropic/9ac47f6518c88fa8d2b0")
    def test_process_inactive_user(self):
        """Inactive user is created, and no profile is created.
        """
        assert len(Profile.objects.all()) == 0

        with self.settings(SHIB_ACTIVATE_AFTER_CREATION=False):
            # reload our shibboleth.backends module, so it picks up the settings change
            importlib.reload(backends)

            resp = self.middleware.process_request(self.request)
            assert resp.url == '/shib-complete/'
            assert len(Profile.objects.all()) == 0

        # now reload again, so it reverts to original settings
        importlib.reload(backends)

    def test_make_profile_for_display_name(self):
        assert len(Profile.objects.all()) == 0

        self.middleware.make_profile(self.user, {
            'display_name': 'display name',
            'givenname': 'g',
            'surname': 's',
            'institution': 'i',
            'contact_email': 'foo@foo.com'
        })

        assert len(Profile.objects.all()) == 1
        assert Profile.objects.all()[0].nickname == 'display name'

    def test_make_profile_for_givenname_surname(self):
        assert len(Profile.objects.all()) == 0

        self.middleware.make_profile(self.user, {
            'givenname': 'g',
            'surname': 's',
            'institution': 'i',
            'contact_email': 'foo@foo.com'
        })

        assert len(Profile.objects.all()) == 1
        assert Profile.objects.all()[0].nickname == 'g s'

    def test_make_profile_for_name_missing(self):
        assert len(Profile.objects.all()) == 0

        self.middleware.make_profile(self.user, {
            'institution': 'i',
            'contact_email': 'foo@foo.com'
        })

        assert len(Profile.objects.all()) == 1
        assert Profile.objects.all()[0].nickname == ''

    @override_settings(SHIBBOLETH_AFFILIATION_ROLE_MAP={
        'employee@school.edu': 'staff',
        'member@school.edu': 'staff',
        'student@school.edu': 'student',
        'patterns': (
            ('a@*.edu', 'aaa'),
            ('*@*.edu', 'student'),
            ('*', 'guest'),
        )
    })
    @patch('shibboleth.middleware.SHIB_ATTRIBUTE_MAP', {
        "Shibboleth-eppn": (True, "username"),
        "givenname": (False, "givenname"),
        "surname": (False, "surname"),
        "emailaddress": (False, "contact_email"),
        "organization": (False, "institution"),
        "Shibboleth-affiliation": (False, "affiliation"),
        "Shibboleth-displayName": (False, "display_name"),
    })
    def test_get_role_by_affiliation(self):
        obj = ShibbolethRemoteUserMiddleware(self.get_response)

        assert obj._get_role_by_affiliation('employee@school.edu') == 'staff'
        assert obj._get_role_by_affiliation('member@school.edu') == 'staff'
        assert obj._get_role_by_affiliation('student@school.edu') == 'student'

        # test jokers
        assert obj._get_role_by_affiliation('student1@school.edu') == 'student'
        assert obj._get_role_by_affiliation('a@x.edu') == 'aaa'
        assert obj._get_role_by_affiliation('a@x.com') == 'guest'

