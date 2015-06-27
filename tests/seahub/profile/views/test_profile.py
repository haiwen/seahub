from django.core.urlresolvers import reverse
from django.test import TestCase

from seahub.base.accounts import User
from seahub.test_utils import Fixtures

from seaserv import ccnet_threaded_rpc


class DeleteUserAccountTest(TestCase, Fixtures):
    def test_can_delete(self):
        self.client.post(
            reverse('auth_login'), {'username': self.user.username,
                                    'password': 'secret'}
        )

        username = self.user.username

        resp = self.client.post(
            reverse('delete_user_account')
        )

        self.assertEqual(302, resp.status_code)
        assert len(ccnet_threaded_rpc.search_emailusers('DB', username, -1, -1))  == 0
