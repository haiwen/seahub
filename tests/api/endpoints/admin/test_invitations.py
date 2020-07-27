import time
import json
from mock import patch

from django.utils import timezone
from django.urls import reverse
from django.test import override_settings

from seahub.test_utils import BaseTestCase
from seahub.invitations.models import Invitation
from seahub.api2.permissions import CanInviteGuest
from seahub.base.accounts import UserPermissions
from seahub.invitations import models


@patch('seahub.api2.endpoints.admin.invitations.ENABLE_GUEST_INVITATION', True)
class InvitationsTest(BaseTestCase):
    def setUp(self):
        self.url = reverse('api-v2.1-admin-invitations')

    @patch.object(CanInviteGuest, 'has_permission')
    @patch.object(UserPermissions, 'can_invite_guest')
    def test_can_del_all_expired_invitation(self, mock_has_permission, mock_can_invite_guest):
        self.login_as(self.admin)

        mock_has_permission = True
        mock_can_invite_guest = True

        invitations_number = len(Invitation.objects.all())
        self._add_invitations('test@noway.com')
        self._add_invitations('test1@noway.com')
        new_invitations_number = len(Invitation.objects.all())
        self.assertEqual(2, new_invitations_number-invitations_number)

        time.sleep(2)
        resp = self.client.delete(self.url+"?type=expired")
        self.assertEqual(200, resp.status_code)
        self.assertEqual(invitations_number, len(Invitation.objects.all()))

    def _add_invitations(self, email):
        entry = models.Invitation(token=models.gen_token(max_length=32),
                         inviter=self.admin,
                         accepter=email,
                         invite_type=models.GUEST,
                         expire_time=timezone.now())
        entry.save()

    def test_get_invitations(self):
        self.login_as(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert type(json_resp['invitation_list']) is list

    def test_no_permission(self):
        self.logout()
        self.login_as(self.admin_cannot_manage_user)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_get_invitations_permision_denied(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_invalid_args(self):
        self.login_as(self.admin)
        resp = self.client.delete(self.url+"?type=expired122")
        self.assertEqual(400, resp.status_code)


@patch('seahub.api2.endpoints.admin.invitations.ENABLE_GUEST_INVITATION', True)
class InvitationTest(BaseTestCase):
    def setUp(self):
        pass

    def _add_invitations(self, email):
        token = models.gen_token(max_length=32)
        entry = models.Invitation(token=token,
                                  inviter=self.admin,
                                  accepter=email,
                                  invite_type=models.GUEST,
                                  expire_time=timezone.now())
        entry.save()
        return token

    def _remove_invitation(self, token):
        invitation = Invitation.objects.get(token=token)
        invitation.delete()

    def test_can_delete(self):
        self.login_as(self.admin)

        token = self._add_invitations('test@noway.com')
        url = reverse('api-v2.1-admin-invitation', args=[token])
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)

    def test_delete_share_link_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_invitations('test@noway.com')
        url = reverse('api-v2.1-admin-invitation', args=[token])
        resp = self.client.delete(url)
        self.assertEqual(403, resp.status_code)

        self._remove_invitation(token)
