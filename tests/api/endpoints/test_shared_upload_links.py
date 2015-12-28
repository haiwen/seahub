import json

from django.utils.dateformat import DateFormat

from seahub.share.models import UploadLinkShare
from seahub.test_utils import BaseTestCase

class SharedUploadLinksTest(BaseTestCase):
    def tearDown(self):
        self.remove_repo()

    def test_can_list(self):
        ls = UploadLinkShare.objects.create_upload_link_share(
            self.user.username,
            self.repo.id, self.folder)

        enc_ls = UploadLinkShare.objects.create_upload_link_share(
            self.user.username,
            self.repo.id, self.folder, password='123', expire_date=None)

        self.login_as(self.user)
        resp = self.client.get(
            '/api2/shared-upload-links/',
        )
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 2

        assert json_resp[0]['username'] == ls.username
        assert json_resp[0]['repo_id'] == ls.repo_id
        assert json_resp[0]['ctime'].startswith(
            ls.ctime.strftime("%Y-%m-%dT%H:%M:%S"))
        assert json_resp[0]['token'] == ls.token
        assert json_resp[0]['view_cnt'] == ls.view_cnt
        assert json_resp[0]['path'] == ls.path
