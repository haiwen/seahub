from django.urls import reverse

from seahub.test_utils import BaseTestCase

from seaserv import ccnet_threaded_rpc


class DeleteUserAccountTest(BaseTestCase):
    def test_can_delete(self):
        self.login_as(self.user)

        username = self.user.username

        resp = self.client.post(
            reverse('delete_user_account')
        )

        self.assertEqual(302, resp.status_code)
        assert len(ccnet_threaded_rpc.search_emailusers('DB', username, -1, -1))  == 0
