from django.conf import settings
from django.test import RequestFactory

from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from shibboleth import backends
from shibboleth.middleware import ShibbolethRemoteUserMiddleware

settings.AUTHENTICATION_BACKENDS += (
    'shibboleth.backends.ShibbolethRemoteUserBackend',
)

settings.MIDDLEWARE_CLASSES += (
    'shibboleth.middleware.ShibbolethRemoteUserMiddleware',
)


class ShibbolethRemoteUserMiddlewareTest(BaseTestCase):
    def setUp(self):
        self.remove_user('sampledeveloper@school.edu')

        self.middleware = ShibbolethRemoteUserMiddleware()
        self.factory = RequestFactory()
        # Create an instance of a GET request.
        self.request = self.factory.get('/foo/')

        self.request.user = self.user
        self.request.user.is_authenticated = lambda: False
        self.request.cloud_mode = False
        self.request.session = self.client.session

        self.request.META = {}
        self.request.META['Shibboleth-eppn'] = 'sampledeveloper@school.edu'
        self.request.META['REMOTE_USER'] = 'sampledeveloper@school.edu'
        self.request.META['givenname'] = 'test_gname'
        self.request.META['surname'] = 'test_sname'

    def test_can_process(self):
        assert len(Profile.objects.all()) == 0

        self.middleware.process_request(self.request)
        assert len(Profile.objects.all()) == 1
        assert self.request.shib_login is True

    def test_process_inactive_user(self):
        """Inactive user is created, and no profile is created.
        """
        assert len(Profile.objects.all()) == 0

        with self.settings(SHIB_ACTIVATE_AFTER_CREATION=False):
            # reload our shibboleth.backends module, so it picks up the settings change
            reload(backends)

            resp = self.middleware.process_request(self.request)
            assert resp.url == 'shib-complete'
            assert len(Profile.objects.all()) == 0

        # now reload again, so it reverts to original settings
        reload(backends)

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
