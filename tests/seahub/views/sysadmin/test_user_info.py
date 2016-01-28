import os
from django.core.urlresolvers import reverse

from tests.common.utils import randstring

from seahub.share.models import FileShare
from seahub.test_utils import BaseTestCase

from seaserv import ccnet_threaded_rpc, seafile_api


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
        ccnet_threaded_rpc.group_add_member(self.admin_group_1_id,
                self.admin.email, self.user.email)
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
        self.assertContains(resp, 'id="user-admin-groups"')

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
