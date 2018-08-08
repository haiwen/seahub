import os
import openpyxl
from io import BytesIO
from mock import patch
from django.core.urlresolvers import reverse
from post_office.models import Email

from seahub.base.accounts import User
from seahub.options.models import (UserOptions, KEY_FORCE_PASSWD_CHANGE)
from seahub.test_utils import BaseTestCase
from seahub.utils.ms_excel import write_xls as real_write_xls

import pytest
pytestmark = pytest.mark.django_db

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
        assert 'Successfully deleted %s' % username in resp.cookies['messages'].value
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


class BatchAddUserTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()
        self.login_as(self.admin)

        from constance import config
        self.config = config

        self.new_users = []
        self.excel_file = os.path.join(os.getcwd(), 'tests/seahub/views/sysadmin/batch_add_user.xlsx')
        data_list = []
        data_list.append(['email', 'password', 'username', 'role', 'quota'])
        for i in xrange(20):
            username = "username@test" + str(i) +".com"
            password = "password"
            name = "name_test" + str(i)
            if i < 10:
                role = "guest"
            else:
                role = "default"
            quota = "999"
            data_list.append([username, password, name, role, quota])
            self.new_users.append(username)
        wb = real_write_xls('test', data_list[0], data_list[1:])
        wb.save(self.excel_file)

    def tearDown(self):
        for u in self.new_users:
            self.remove_user(u)

    def test_can_batch_add(self):
        for e in self.new_users:
            try:
                r = User.objects.get(e)
            except User.DoesNotExist:
                r = None
            assert r is None

        with open(self.excel_file) as f:
            resp = self.client.post(reverse('batch_add_user'), {
                'file': f
            })

        self.assertEqual(302, resp.status_code)
        assert 'Import succeeded' in resp.cookies['messages'].value
        for e in self.new_users:
            assert User.objects.get(e) is not None

    def test_can_batch_add_when_pwd_change_required(self):
        self.config.FORCE_PASSWORD_CHANGE = 1

        for e in self.new_users:
            assert len(UserOptions.objects.filter(
                email=e, option_key=KEY_FORCE_PASSWD_CHANGE)) == 0

        for e in self.new_users:
            try:
                r = User.objects.get(e)
            except User.DoesNotExist:
                r = None
            assert r is None

        with open(self.excel_file) as f:
            resp = self.client.post(reverse('batch_add_user'), {
                'file': f
            })

        self.assertEqual(302, resp.status_code)
        assert 'Import succeeded' in resp.cookies['messages'].value
        for e in self.new_users:
            assert User.objects.get(e) is not None
            assert UserOptions.objects.passwd_change_required(e)

    def test_can_batch_add_when_pwd_change_not_required(self):
        self.config.FORCE_PASSWORD_CHANGE = 0

        for e in self.new_users:
            assert len(UserOptions.objects.filter(
                email=e, option_key=KEY_FORCE_PASSWD_CHANGE)) == 0

        for e in self.new_users:
            try:
                r = User.objects.get(e)
            except User.DoesNotExist:
                r = None
            assert r is None

        with open(self.excel_file) as f:
            resp = self.client.post(reverse('batch_add_user'), {
                'file': f
            })

        self.assertEqual(302, resp.status_code)
        assert 'Import succeeded' in resp.cookies['messages'].value
        for e in self.new_users:
            assert User.objects.get(e) is not None
            assert not UserOptions.objects.passwd_change_required(e)

    @patch('seahub.views.sysadmin.user_number_over_limit')
    def test_can_not_batch_add_if_user_over_limit(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = True

        for e in self.new_users:
            try:
                r = User.objects.get(e)
            except User.DoesNotExist:
                r = None
            assert r is None

        with open(self.excel_file) as f:
            resp = self.client.post(reverse('batch_add_user'), {
                'file': f
            })

        self.assertEqual(302, resp.status_code)
        assert 'users exceeds the limit' in resp.cookies['messages'].value

    def test_can_send_email(self):
        self.assertEqual(0, len(Email.objects.all()))

        with open(self.excel_file) as f:
            resp = self.client.post(reverse('batch_add_user'), {
                'file': f
            })

        self.assertEqual(302, resp.status_code)
        self.assertNotEqual(0, len(Email.objects.all()))

        email = Email.objects.all()[0]
        assert self.new_users[0] == email.to[0]
        assert "Email: %s" % self.new_users[0] in email.html_message
        assert email.status == 2


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
        rows.next()
        for r in rows:
            assert r[0].value == 'test' + str(i) + '@example.com'
            assert r[1].value == '123456'
            assert r[2].value == 'test' + str(i)
            assert r[3].value == 'default'
            assert r[4].value == '1000'
            i += 1
