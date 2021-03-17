import json
from mock import patch

from django.test import override_settings

from seahub.base.accounts import UserPermissions
from seahub.invitations.models import Invitation
from seahub.test_utils import BaseTestCase
from seahub.api2.permissions import CanInviteGuest

class InvitationsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = '/api/v2.1/invitations/'
        self.username = self.user.username

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_add(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        assert len(Invitation.objects.all()) == 0
        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': 'some_random_user@1.com',
        })
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['inviter'] == self.username
        assert json_resp['accepter'] == 'some_random_user@1.com'
        assert json_resp['expire_time'] is not None

        assert len(Invitation.objects.all()) == 1

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_not_add_same_email(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        assert len(Invitation.objects.all()) == 0
        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': 'some_random_user@1.com',
        })
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['inviter'] == self.username
        assert json_resp['accepter'] == 'some_random_user@1.com'
        assert json_resp['expire_time'] is not None

        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': 'some_random_user@1.com',
        })
        self.assertEqual(400, resp.status_code)
        assert len(Invitation.objects.all()) == 1

    @override_settings(INVITATION_ACCEPTER_BLACKLIST=["a@a.com", "*@a-a-a.com", r".*@(foo|bar).com"])
    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_not_add_blocked_email(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        assert len(Invitation.objects.all()) == 0
        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': 'some_random_user@a-a-a.com',
        })
        self.assertEqual(400, resp.status_code)
        assert len(Invitation.objects.all()) == 0

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_list(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        Invitation.objects.add(inviter=self.username, accepter='1@1.com')
        Invitation.objects.add(inviter=self.username, accepter='1@2.com')

        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 2


class BatchInvitationsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = '/api/v2.1/invitations/batch/'
        self.username = self.user.username

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_add_with_batch(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        assert len(Invitation.objects.all()) == 0
        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': ['some_random_user@1.com', 'some_random_user@2.com'],
        })
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert self.username == json_resp['success'][0]['inviter']
        assert 'some_random_user@1.com' == json_resp['success'][0]['accepter']
        assert 'some_random_user@2.com' == json_resp['success'][1]['accepter']
        assert json_resp['success'][0]['expire_time'] is not None

        assert len(Invitation.objects.all()) == 2

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_not_add_same_email_with_batch(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        assert len(Invitation.objects.all()) == 0
        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': ['some_random_user@1.com', 'some_random_user@2.com'],
        })
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert self.username == json_resp['success'][0]['inviter']
        assert 'some_random_user@1.com' == json_resp['success'][0]['accepter']
        assert 'some_random_user@2.com' == json_resp['success'][1]['accepter']
        assert json_resp['success'][0]['expire_time'] is not None

        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': ['some_random_user@1.com', 'some_random_user@2.com'],
        })
        json_resp = json.loads(resp.content)
        assert 'some_random_user@1.com' == json_resp['failed'][0]['email']
        assert 'some_random_user@2.com' == json_resp['failed'][1]['email']
        assert 'already invited' in json_resp['failed'][0]['error_msg']
        assert 'already invited' in json_resp['failed'][1]['error_msg']

    @override_settings(INVITATION_ACCEPTER_BLACKLIST=["*@2-1.com", "*@1-1.com", r".*@(foo|bar).com"])
    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_not_add_blocked_email(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        assert len(Invitation.objects.all()) == 0
        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': ['some_random_user@1-1.com', 'some_random_user@2-1.com'],
        })
        assert len(Invitation.objects.all()) == 0
        json_resp = json.loads(resp.content)
        assert 'some_random_user@1-1.com' == json_resp['failed'][0]['email']
        assert 'some_random_user@2-1.com' == json_resp['failed'][1]['email']
        assert 'The email address is not allowed to be invited as a guest.' == json_resp['failed'][0]['error_msg']
        assert 'The email address is not allowed to be invited as a guest.' == json_resp['failed'][1]['error_msg']

    def test_without_permission(self):
        self.logout()
        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': ['some_random_user@1-1.com', 'some_random_user@2-1.com'],
        })
        json_resp = json.loads(resp.content)

        assert len(Invitation.objects.all()) == 0
        self.assertEqual(403, resp.status_code)
        assert 'Authentication credentials were not provided.' == json_resp['detail']

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_with_invalid_email(self, mock_can_invite_guest, mock_has_permission):

        mock_can_invite_guest.return_val = True
        mock_has_permission.return_val = True

        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': ['some_random _user@1-1.com', 's ome_random_user@2-1.com'],
        })
        json_resp = json.loads(resp.content)

        assert len(Invitation.objects.all()) == 0
        assert 'some_random _user@1-1.com' == json_resp['failed'][0]['email']
        assert 's ome_random_user@2-1.com' == json_resp['failed'][1]['email']
        assert 'invalid.' in json_resp['failed'][0]['error_msg']
        assert 'invalid.' in json_resp['failed'][0]['error_msg']
