import json
from mock import patch

from django.test import override_settings

from django.urls import reverse
from seahub.base.accounts import UserPermissions
from seahub.invitations.models import Invitation, RepoShareInvitation
from seahub.test_utils import BaseTestCase
from seahub.api2.permissions import CanInviteGuest


class RepoShareInvitationsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.username = self.user.username
        self.repo_id = self.repo.id
        self.url = reverse(
            'api-v2.1-repo-share-invitations', args=[self.repo_id])

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_list(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        invitation_obj_1 = Invitation.objects.add(
            inviter=self.username, accepter='1@qq.com')
        invitation_obj_2 = Invitation.objects.add(
            inviter=self.username, accepter='1@qq.com')

        RepoShareInvitation.objects.add(invitation_obj_1, self.repo_id, '/', 'r')
        RepoShareInvitation.objects.add(invitation_obj_2, self.repo_id, '/', 'rw')

        resp = self.client.get(self.url + '?path=/')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp.get('repo_share_invitation_list')) == 2


class RepoShareInvitationsBatchTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.username = self.user.username
        self.repo_id = self.repo.id
        self.url = reverse(
            'api-v2.1-repo-share-invitations-batch', args=[self.repo_id])

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_add_with_batch(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        data = json.dumps({
            'type': 'guest',
            'accepters': ['1@qq.com', '2@qq.com'],
            'path': '/',
            'permission': 'r',
        })
        resp = self.client.post(self.url, data, 'application/json')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert self.username == json_resp['success'][0]['inviter']
        assert '1@qq.com' == json_resp['success'][0]['accepter']
        assert '2@qq.com' == json_resp['success'][1]['accepter']
        assert json_resp['success'][0]['expire_time'] is not None

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_with_invalid_path(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        data = json.dumps({
            'type': 'guest',
            'accepters': ['1@qq.com', '2@qq.com'],
            'path': '/invalid_path',
            'permission': 'r',
        })
        resp = self.client.post(self.url, data, 'application/json')
        self.assertEqual(404, resp.status_code)

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_with_invalid_user(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        self.logout()
        self.login_as(self.admin)

        data = json.dumps({
            'type': 'guest',
            'accepters': ['1@qq.com', '2@qq.com'],
            'path': '/',
            'permission': 'r',
        })
        resp = self.client.post(self.url, data, 'application/json')
        self.assertEqual(403, resp.status_code)
        self.logout
