from mock import Mock

from django.conf import settings
from django.test import RequestFactory

from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from shibboleth.middleware import ShibbolethRemoteUserMiddleware

settings.AUTHENTICATION_BACKENDS += (
    'shibboleth.backends.ShibbolethRemoteUserBackend',
)

class ShibbolethRemoteUserMiddlewareTest(BaseTestCase):
    def setUp(self):
        self.middleware = ShibbolethRemoteUserMiddleware()

        self.factory = RequestFactory()

        # Create an instance of a GET request.
        self.request = self.factory.get('/foo/')
        # self.request = Mock()

        self.request.user = self.user
        self.request.user.is_authenticated = lambda: False
        self.request.cloud_mode = False
        self.request.session = {}

        self.request.META = {}
        self.request.META['REMOTE_USER'] = self.user.username
        self.request.META['eppn'] = 'test eppn'
        self.request.META['givenname'] = 'test_gname'
        self.request.META['surname'] = 'test_sname'

    # def test_can_process(self):
    #     assert len(Profile.objects.all()) == 0

    #     self.middleware.process_request(self.request)

    #     assert len(Profile.objects.all()) == 1
    #     assert self.request.shib_login is True

    def test_make_profile_for_display_name(self):
        assert len(Profile.objects.all()) == 0

        self.middleware.make_profile(self.user, {
            'display_name': 'display name',
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
