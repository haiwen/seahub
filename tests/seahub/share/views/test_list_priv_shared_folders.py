# -*- coding: utf-8 -*-
import os

from django.core.urlresolvers import reverse

from seaserv import seafile_api

from seahub.test_utils import BaseTestCase
class ListPrivSharedFoldersTest(BaseTestCase):
    def tearDown(self):
        self.remove_repo()

    def test_can_list_priv_shared_folders(self):
        repo_id = self.repo.id
        username = self.user.username

        parent_dir = '/'
        dirname = 'test-folder'
        full_dir_path = os.path.join(parent_dir, dirname)

        # create folder
        self.create_folder(repo_id=repo_id,
                           parent_dir=parent_dir,
                           dirname=dirname,
                           username=username)

        sub_repo_id = seafile_api.create_virtual_repo(repo_id, full_dir_path, dirname, dirname, username)
        seafile_api.share_repo(sub_repo_id, username, self.admin.username, 'rw')

        self.login_as(self.user)
        resp = self.client.get(reverse('list_priv_shared_folders'))
        self.assertEqual(200, resp.status_code)
        href = reverse("view_common_lib_dir", args=[repo_id, full_dir_path.strip('/')])
        self.assertRegexpMatches(resp.content, href)
