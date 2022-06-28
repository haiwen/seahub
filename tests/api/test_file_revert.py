import os
import json
from seaserv import seafile_api
from django.urls import reverse
from seahub.test_utils import BaseTestCase

class FileRevertTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path = self.file
        self.parent_dir = os.path.dirname(self.file_path)
        self.file_name = os.path.basename(self.file_path)
        self.username = self.user.username

        self.url = reverse('api2-file-revert', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    def delete_file(self):
        seafile_api.del_file(self.repo_id, self.parent_dir,
                            json.dumps([self.file_name]),
                            self.username)

    def get_trash_file_commit_id(self):
        deleted_file = seafile_api.get_deleted(self.repo_id, 0, '/', None)

        return deleted_file[0].commit_id

    def get_lib_file_name(self):

        url = reverse('list_lib_dir', args=[self.repo_id])
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)

        if len(json_resp['dirent_list']) == 0:
            return None

        return json_resp['dirent_list'][0]['obj_name']

    def test_can_revert_file(self):
        self.login_as(self.user)

        # check file exist when init
        assert self.get_lib_file_name() == self.file_name

        # delete
        self.delete_file()

        # check file not exist after delete
        assert self.get_lib_file_name() == None

        # get commit_id of deleted file
        commit_id = self.get_trash_file_commit_id()

        resp = self.client.put(self.url,
            "p=%s&commit_id=%s" % (self.file_path, commit_id),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)

        # check file has been reverted
        assert self.get_lib_file_name() == self.file_name

    def test_can_revert_unicode_filename(self):
        # todo
        pass
