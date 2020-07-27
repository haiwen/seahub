import json
from mock import patch

from seahub.base.accounts import UserPermissions
from seahub.invitations.models import Invitation, RepoShareInvitation
from seahub.test_utils import BaseTestCase
from seahub.api2.permissions import CanInviteGuest
from tests.common.utils import randstring
from seahub.base.accounts import User
from django.urls import reverse


class InvitationsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.username = self.user.username
        self.repo_id = self.repo.id
        self.url = reverse(
            'api-v2.1-repo-share-invitation', args=[self.repo_id])

        self.i = Invitation.objects.add(
            inviter=self.username, accepter='3@qq.com')
        assert len(Invitation.objects.all()) == 1
        RepoShareInvitation.objects.add(self.i, self.repo_id, '/', 'r')
        assert len(RepoShareInvitation.objects.all()) == 1

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_put(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        data = json.dumps({
            'token': self.i.token,
            'path': '/',
            'permission': 'rw',

        })
        resp = self.client.put(self.url, data, 'application/json')
        self.assertEqual(200, resp.status_code)

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_not_put_with_exist_permission(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        data = json.dumps({
            'token': self.i.token,
            'path': '/',
            'permission': 'r',

        })
        resp = self.client.put(self.url, data, 'application/json')
        self.assertEqual(400, resp.status_code)

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_delete(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        data = json.dumps({
            'token': self.i.token,
            'path': '/',
        })
        resp = self.client.delete(self.url, data, 'application/json')
        self.assertEqual(200, resp.status_code)

        assert len(RepoShareInvitation.objects.all()) == 0

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_not_delete_with_invalid_path(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        data = json.dumps({
            'token': self.i.token,
            'path': '/invalid_path',
        })
        resp = self.client.delete(self.url, data, 'application/json')
        self.assertEqual(404, resp.status_code)
