import time
from mock import patch

from django.utils import timezone
from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.invitations.models import Invitation
from seahub.api2.permissions import CanInviteGuest
from seahub.base.accounts import UserPermissions
from seahub.invitations import models


class InvitationsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)
        self.delete_url = reverse('api-v2.1-admin-invitations')
   
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
        resp = self.client.delete(self.delete_url+"?type=expired")
        self.assertEqual(200, resp.status_code)
        self.assertEqual(invitations_number, len(Invitation.objects.all()))

    def _add_invitations(self, email):
        entry = models.Invitation(token=models.gen_token(max_length=32),
                         inviter=self.admin,
                         accepter=email,
                         invite_type=models.GUEST,
                         expire_time=timezone.now())
        entry.save()

    def test_invalid_args(self):
        resp = self.client.delete(self.delete_url+"?type=expired122")
        self.assertEqual(400, resp.status_code)

