from unittest.mock import patch

import pytest
pytestmark = pytest.mark.django_db

from django.test import RequestFactory

from seahub.auth.backends import SeafileRemoteUserBackend
from seahub.auth.models import SocialAuthUser
from seahub.krb5_auth.backend import RemoteKrbBackend
from seahub.test_utils import BaseTestCase
from seahub.utils.auth import KRB5_PROVIDER, REMOTE_USER_PROVIDER


class RemoteBackendTest(BaseTestCase):
    def test_remote_user_backend_persists_remote_source(self):
        backend = SeafileRemoteUserBackend()
        request = RequestFactory().get('/')

        with patch.object(backend, 'get_user', side_effect=[self.user, self.user]), \
                patch.object(backend, 'configure_user'):
            user = backend.authenticate(request=request, remote_user=self.user.username)

        self.assertEqual(user, self.user)
        self.assertTrue(SocialAuthUser.objects.filter(
            username=self.user.username,
            provider=REMOTE_USER_PROVIDER,
            uid=self.user.username,
        ).exists())

    def test_kerberos_backend_persists_kerberos_source(self):
        backend = RemoteKrbBackend()

        with patch.object(backend, 'get_user', return_value=self.user):
            user = backend.authenticate(self.user.username)

        self.assertEqual(user, self.user)
        self.assertTrue(SocialAuthUser.objects.filter(
            username=self.user.username,
            provider=KRB5_PROVIDER,
            uid=self.user.username,
        ).exists())
