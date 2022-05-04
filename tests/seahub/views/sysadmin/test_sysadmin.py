import os
import openpyxl
from io import BytesIO
from mock import patch
from django.urls import reverse

from seahub.base.accounts import User
from seahub.options.models import (UserOptions, KEY_FORCE_PASSWD_CHANGE)
from seahub.test_utils import BaseTestCase
from seahub.utils.ms_excel import write_xls as real_write_xls

import pytest
pytestmark = pytest.mark.django_db

from seaserv import ccnet_threaded_rpc

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
        self.assertRedirects(resp, reverse('sys_info'))


class SysGroupAdminExportExcelTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_can_export_excel(self):
        resp = self.client.get(reverse('sys_group_admin_export_excel'))
        self.assertEqual(200, resp.status_code)
        assert 'application/ms-excel' in resp.headers['content-type']


class SysUserAdminExportExcelTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_can_export_excel(self):
        resp = self.client.get(reverse('sys_useradmin_export_excel'))
        self.assertEqual(200, resp.status_code)
        assert 'application/ms-excel' in resp.headers['content-type']

    def write_xls(self, sheet_name, head, data_list):
        assert 'Role' in head
        return real_write_xls(sheet_name, head, data_list)

    @patch('seahub.views.sysadmin.write_xls')
    @patch('seahub.views.sysadmin.is_pro_version')
    def test_can_export_excel_in_pro(self, mock_is_pro_version, mock_write_xls):
        mock_is_pro_version.return_value = True
        mock_write_xls.side_effect = self.write_xls

        # mock_write_xls.assert_called_once()
        resp = self.client.get(reverse('sys_useradmin_export_excel'))
        self.assertEqual(200, resp.status_code)
        assert 'application/ms-excel' in resp.headers['content-type']

class BatchAddUserHelpTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)

    def test_can_get_excel(self):
        resp = self.client.get(reverse('batch_add_user_example')+"?type=xlsx")
        assert resp.status_code == 200

    def test_validate_excel(self):
        resp = self.client.get(reverse('batch_add_user_example')+"?type=xlsx")
        wb = openpyxl.load_workbook(filename=BytesIO(resp.content), read_only=True)
        assert wb.sheetnames[0] == 'sample'
        rows = wb.worksheets[0].rows
        i = 0
        next(rows)
        for r in rows:
            assert r[0].value == 'test' + str(i) + '@example.com'
            assert r[1].value == '123456'
            assert r[2].value == 'test' + str(i)
            assert r[3].value == 'default'
            assert r[4].value == '1000'
            i += 1
