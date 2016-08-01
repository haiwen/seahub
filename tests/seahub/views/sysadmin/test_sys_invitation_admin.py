from mock import patch

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

@patch('seahub.views.sysadmin.ENABLE_GUEST_INVITATION')
class SysInvitationAdminTest(BaseTestCase):
    def test_can_list(self, mock_enable_guest_invitation):

        mock_enable_guest_invitation.return_value = True

        self.login_as(self.admin)

        resp = self.client.get(reverse('sys_invitation_admin'))
        self.assertEqual(resp.status_code, 200)
        self.assertTemplateUsed('sysadmin/sys_invitations_admin.html')
