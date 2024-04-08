from django.core import mail
from django.conf import settings

from shibboleth import backends

from seahub.base.accounts import User
from seahub.auth import authenticate
from seahub.auth.models import SocialAuthUser
from seahub.test_utils import BaseTestCase
import importlib

SAMPLE_HEADERS = {
    "REMOTE_USER": 'sampledeveloper@school.edu',
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
    # "eppn": (True, "username"),
    "givenname": (False, "givenname"),
    "surname": (False, "surname"),
    "emailaddress": (False, "contact_email"),
    "organization": (False, "institution"),    
}

settings.AUTHENTICATION_BACKENDS += (
    'shibboleth.backends.ShibbolethRemoteUserBackend',
)

settings.MIDDLEWARE.append(
    'shibboleth.middleware.ShibbolethRemoteUserMiddleware',
)

SHIBBOLETH_PROVIDER_IDENTIFIER = getattr(settings, 'SHIBBOLETH_PROVIDER_IDENTIFIER', 'shibboleth')


class ShibbolethRemoteUserBackendTest(BaseTestCase):
    def setUp(self):
        self.remote_user = 'sampledeveloper@school.edu'
        self.remove_user(self.remote_user)

    def test_create_unknown_user(self):
        with self.assertRaises(User.DoesNotExist):
            self.assertFalse(User.objects.get(self.remote_user))

        user = authenticate(remote_user=self.remote_user,
                            shib_meta=SAMPLE_HEADERS)
        assert user.is_active is True
        shib_user = SocialAuthUser.objects.get_by_provider_and_uid(SHIBBOLETH_PROVIDER_IDENTIFIER, self.remote_user)
        self.assertEqual(shib_user.uid, 'sampledeveloper@school.edu')
        self.assertEqual(User.objects.get(shib_user.username).username,
                         shib_user.username)

    def test_notify_admins_on_activate_request(self):
        self.assertEqual(len(mail.outbox), 0)
        with self.assertRaises(User.DoesNotExist):
            self.assertFalse(User.objects.get(self.remote_user))

        with self.settings(SHIB_ACTIVATE_AFTER_CREATION=False):
            # reload our shibboleth.backends module, so it picks up the settings change
            importlib.reload(backends)
            user = authenticate(remote_user=self.remote_user,
                                shib_meta=SAMPLE_HEADERS)
            shib_user = SocialAuthUser.objects.get_by_provider_and_uid(SHIBBOLETH_PROVIDER_IDENTIFIER, self.remote_user)
            self.assertEqual(shib_user.uid, 'sampledeveloper@school.edu')
            assert user.is_active is False

        assert len(mail.outbox) != 0
        assert 'a newly registered account need to be activated' in mail.outbox[0].body
        # now reload again, so it reverts to original settings
        importlib.reload(backends)
