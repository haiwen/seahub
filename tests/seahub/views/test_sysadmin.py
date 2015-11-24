import os
from mock import patch
from django.core.urlresolvers import reverse
from django.http.cookie import parse_cookie

from tests.common.utils import randstring

from seahub.base.accounts import User
from seahub.utils.ms_excel import write_xls as real_write_xls
from seahub.test_utils import BaseTestCase
from seahub.share.models import FileShare

from seaserv import ccnet_threaded_rpc, seafile_api

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


class UserInfoTest(BaseTestCase):

    def setUp(self):

        self.login_as(self.admin)

        # create group for admin user
        self.admin_group_1_name = randstring(6)
        self.admin_group_1_id = ccnet_threaded_rpc.create_group(self.admin_group_1_name,
                self.admin.email)

        # create another group for admin user
        self.admin_group_2_name = randstring(6)
        self.admin_group_2_id = ccnet_threaded_rpc.create_group(self.admin_group_2_name,
                self.admin.email)

        # create repo for admin user
        self.admin_repo_name = randstring(6)
        r = seafile_api.get_repo(self.create_repo(name=self.admin_repo_name,
            desc='', username=self.admin.email, passwd=None))
        self.admin_repo_id = r.id

        # set common user as staff in admin user's group
        ccnet_threaded_rpc.group_set_admin(self.admin_group_1_id, self.user.email)

        # add common user to admin user's another group
        ccnet_threaded_rpc.group_add_member(self.admin_group_2_id,
                self.admin.email, self.user.email)

        # share admin user's repo to common user
        seafile_api.share_repo(self.admin_repo_id, self.admin.email,
                               self.user.email, 'rw')

    def tearDown(self):

        # remove common user's repo and group
        self.remove_group()
        self.remove_repo()

        # remove admin user's group
        ccnet_threaded_rpc.remove_group(self.admin_group_1_id, self.admin.email)

        # remove admin user's another group
        ccnet_threaded_rpc.remove_group(self.admin_group_2_id, self.admin.email)

        # remove amdin user's repo
        seafile_api.remove_repo(self.admin_repo_id)

    def test_can_render(self):

        resp = self.client.get(reverse('user_info', kwargs={'email': self.user.email}))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/userinfo.html')
        self.assertContains(resp, 'id="owned"')
        self.assertContains(resp, 'id="shared"')
        self.assertContains(resp, 'id="shared-links"')
        self.assertContains(resp, 'id="groups"')

    def test_can_list_owned_repos(self):

        repo_id = self.repo.id
        resp = self.client.get(reverse('user_info', kwargs={'email': self.user.email}))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/userinfo.html')
        self.assertContains(resp, repo_id)

    def test_can_list_shared_repos(self):

        resp = self.client.get(reverse('user_info', kwargs={'email': self.user.email}))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/userinfo.html')
        self.assertContains(resp, self.admin_repo_name)

    def test_can_list_shared_links(self):

        repo_id = self.repo.id
        file_path = self.file
        dir_path = self.folder
        file_name = os.path.basename(file_path)
        dir_name = os.path.basename(dir_path)

        # create dir shared link for common user
        share_info = {
            'username': self.user.email,
            'repo_id': repo_id,
            'path': dir_path,
            'password': None,
            'expire_date': None,
        }
        FileShare.objects.create_dir_link(**share_info)

        # create file shared link for common user
        share_info = {
            'username': self.user.email,
            'repo_id': repo_id,
            'path': file_path,
            'password': None,
            'expire_date': None,
        }
        FileShare.objects.create_file_link(**share_info)

        resp = self.client.get(reverse('user_info', kwargs={'email': self.user.email}))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/userinfo.html')
        self.assertContains(resp, dir_name)
        self.assertContains(resp, file_name)

    def test_can_list_groups(self):

        group_name = self.group.group_name
        resp = self.client.get(reverse('user_info', kwargs={'email': self.user.email}))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/userinfo.html')

        self.assertContains(resp, 'Owned')
        self.assertContains(resp, group_name)

        self.assertContains(resp, 'Admin')
        self.assertContains(resp, self.admin_group_1_name)

        self.assertContains(resp, 'Member')
        self.assertContains(resp, self.admin_group_2_name)
