from mock import patch
from django.core.urlresolvers import reverse
from django.http.cookie import parse_cookie

from seahub.base.accounts import User
from seahub.utils.ms_excel import write_xls as real_write_xls
from seahub.test_utils import BaseTestCase

from seaserv import ccnet_threaded_rpc

class UserToggleStatusTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_can_activate(self):
        old_passwd = self.user.enc_password
        resp = self.client.post(
            reverse('user_toggle_status', args=[self.user.username]),
            {'s': 1},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(200, resp.status_code)
        self.assertContains(resp, '"success": true')

        u = User.objects.get(email=self.user.username)
        assert u.is_active is True
        assert u.enc_password == old_passwd

    def test_can_deactivate(self):
        old_passwd = self.user.enc_password
        resp = self.client.post(
            reverse('user_toggle_status', args=[self.user.username]),
            {'s': 0},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(200, resp.status_code)
        self.assertContains(resp, '"success": true')

        u = User.objects.get(email=self.user.username)
        assert u.is_active is False
        assert u.enc_password == old_passwd


class UserResetTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_can_reset(self):
        old_passwd = self.user.enc_password
        resp = self.client.post(
            reverse('user_reset', args=[self.user.email])
        )
        self.assertEqual(302, resp.status_code)

        u = User.objects.get(email=self.user.username)
        assert u.enc_password != old_passwd


class BatchUserMakeAdminTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_can_make_admins(self):
        resp = self.client.post(
            reverse('batch_user_make_admin'), {
                'set_admin_emails': self.user.username
            }, HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )

        old_passwd = self.user.enc_password
        self.assertContains(resp, '"success": true')

        u = User.objects.get(email=self.user.username)
        assert u.is_staff is True
        assert u.enc_password == old_passwd


# class UserMakeAdminTest(TestCase, Fixtures):
#     def test_can_make_admin(self):
#         self.client.post(
#             reverse('auth_login'), {'username': self.admin.username,
#                                     'password': 'secret'}
#         )

#         resp = self.client.get(
#             reverse('user_make_admin', args=[self.user.id])
#         )

#         old_passwd = self.user.enc_password
#         self.assertEqual(302, resp.status_code)

#         u = User.objects.get(email=self.user.username)
#         assert u.is_staff is True
#         assert u.enc_password == old_passwd


class UserRemoveTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_can_remove(self):
        # create one user
        username = self.user.username

        resp = self.client.post(
            reverse('user_remove', args=[username])
        )

        self.assertEqual(302, resp.status_code)
        assert 'Successfully deleted %s' % username in parse_cookie(resp.cookies)['messages']
        assert len(ccnet_threaded_rpc.search_emailusers('DB', username, -1, -1))  == 0


class SudoModeTest(BaseTestCase):
    def test_normal_user_raise_404(self):
        self.login_as(self.user)

        resp = self.client.get(reverse('sys_sudo_mode'))
        self.assertEqual(404, resp.status_code)

    def test_admin_get(self):
        self.login_as(self.admin)

        resp = self.client.get(reverse('sys_sudo_mode'))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/sudo_mode.html')

    def test_admin_post(self):
        self.login_as(self.admin)

        resp = self.client.post(reverse('sys_sudo_mode'), {
            'username': self.admin.username,
            'password': self.admin_password,
        })
        self.assertEqual(302, resp.status_code)
        self.assertRedirects(resp, reverse('sys_useradmin'))


class SysGroupAdminExportExcelTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_can_export_excel(self):
        resp = self.client.get(reverse('sys_group_admin_export_excel'))
        self.assertEqual(200, resp.status_code)
        assert 'application/ms-excel' in resp._headers['content-type']


class SysUserAdminExportExcelTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_can_export_excel(self):
        resp = self.client.get(reverse('sys_useradmin_export_excel'))
        self.assertEqual(200, resp.status_code)
        assert 'application/ms-excel' in resp._headers['content-type']

    def write_xls(self, sheet_name, head, data_list):
        assert 'Role' in head
        return real_write_xls(sheet_name, head, data_list)

    @patch('seahub.views.sysadmin.write_xls')
    @patch('seahub.views.sysadmin.is_pro_version')
    def test_can_export_excel_in_pro(self, mock_is_pro_version, mock_write_xls):
        mock_is_pro_version.return_value = True
        mock_write_xls.side_effect = self.write_xls

        mock_write_xls.assert_called_once()
        resp = self.client.get(reverse('sys_useradmin_export_excel'))
        self.assertEqual(200, resp.status_code)
        assert 'application/ms-excel' in resp._headers['content-type']
