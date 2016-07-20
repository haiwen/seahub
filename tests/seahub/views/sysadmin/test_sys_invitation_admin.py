from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

class SysInvitationAdminTest(BaseTestCase):
    def test_can_list(self):
        self.login_as(self.admin)

        resp = self.client.get(reverse('sys_invitaion_admin'))
        self.assertEqual(resp.status_code, 200)
        self.assertTemplateUsed('sysadmin/sys_invitations_admin.html')
