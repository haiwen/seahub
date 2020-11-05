import json
from mock import patch

from seahub.base.accounts import UserPermissions
from seahub.invitations.models import Invitation
from seahub.test_utils import BaseTestCase
from seahub.api2.permissions import CanInviteGuest
from tests.common.utils import randstring
from seahub.base.accounts import User
from django.urls import reverse


class InvitationsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.username = self.user.username

        self.i = Invitation.objects.add(inviter=self.username,
                                        accepter='1@1.com')
        self.endpoint = '/api/v2.1/invitations/' + self.i.token + '/'
        assert len(Invitation.objects.all()) == 1

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_get_one(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['inviter'] == self.username
        assert json_resp['accepter'] == '1@1.com'

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_get_invalid(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        self.i.delete()
        assert len(Invitation.objects.all()) == 0

        resp = self.client.get(self.endpoint)
        self.assertEqual(404, resp.status_code)

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_get_permission_denied(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        self.logout()
        self.login_as(self.admin)

        resp = self.client.get(self.endpoint)
        self.assertEqual(403, resp.status_code)
        self.logout()

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_delete(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        resp = self.client.delete(self.endpoint)
        self.assertEqual(204, resp.status_code)

        assert len(Invitation.objects.all()) == 0


class InvitationRevokeTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.username = self.user.username
        self.tmp_username = 'user_%s@test.com' % randstring(4)

        # add invitation
        self.i = Invitation.objects.add(inviter=self.username, accepter=self.tmp_username)
        self.endpoint = '/api/v2.1/invitations/' + self.i.token + '/revoke/'
        assert len(Invitation.objects.all()) == 1

        # accept invitation
        self.i.accept()
        self.tmp_user = self.create_user(self.tmp_username, is_staff=False)
        assert self.tmp_user.is_active is True

    def tearDown(self):
        self.remove_user(self.tmp_username)

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_post(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        resp = self.client.post(self.endpoint)
        self.assertEqual(200, resp.status_code)
        tmp_user = User.objects.get(self.tmp_username)

        assert len(Invitation.objects.all()) == 0
        assert tmp_user.is_active is False

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_invite_again_after_revoke(self, mock_can_invite_guest, mock_has_permission):
        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        # revoke
        resp = self.client.post(self.endpoint)
        self.assertEqual(200, resp.status_code)
        tmp_user = User.objects.get(self.tmp_username)

        assert len(Invitation.objects.all()) == 0
        assert tmp_user.is_active is False

        # invite again
        invite_endpoint = '/api/v2.1/invitations/'
        resp = self.client.post(invite_endpoint, {
            'type': 'guest',
            'accepter': self.tmp_username,
        })
        self.assertEqual(201, resp.status_code)
        assert len(Invitation.objects.all()) == 1

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_invite_batch_again_and_accept_again_after_revoke(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        # revoke
        resp = self.client.post(self.endpoint)
        self.assertEqual(200, resp.status_code)
        tmp_user = User.objects.get(self.tmp_username)

        assert len(Invitation.objects.all()) == 0
        assert tmp_user.is_active is False

        # invite again
        invite_batch_endpoint = '/api/v2.1/invitations/batch/'
        resp = self.client.post(invite_batch_endpoint, {
            'type': 'guest',
            'accepter': [self.tmp_username, ],
        })
        self.assertEqual(200, resp.status_code)
        assert len(Invitation.objects.all()) == 1

        # accept again
        self.logout()

        iv = Invitation.objects.all()[0]
        token_endpoint = reverse('invitations:token_view', args=[iv.token])
        assert iv.accept_time is None
        resp = self.client.post(token_endpoint, {
            'password': 'passwd'
        })
        self.assertEqual(302, resp.status_code)
        assert Invitation.objects.get(pk=iv.pk).accept_time is not None
        tmp_user_accept = User.objects.get(self.tmp_username)
        assert tmp_user_accept.is_active is True
