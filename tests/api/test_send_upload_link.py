#coding: UTF-8
import json
from django.core.urlresolvers import reverse
from seahub.utils import IS_EMAIL_CONFIGURED
from seahub.test_utils import BaseTestCase


class SendUploadLinkApiTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)
        self.token = self.get_upload_link_token()

    def tearDown(self):
        self.remove_repo()

    def get_upload_link_token(self):

        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=d&share_type=upload" % (self.folder),
            'application/x-www-form-urlencoded',
        )

        return resp._headers['location'][1].split('/')[-2]

    def test_can_send_email(self):
        invalid_email = 'invalid'
        url = reverse("api2-send-upload-link")
        data = {
            "token": self.token,
            "email": self.admin.email + ',' + invalid_email,
        }

        resp = self.client.post(url, data)
        if not IS_EMAIL_CONFIGURED:
            self.assertEqual(403, resp.status_code)
        else:
            self.assertEqual(200, resp.status_code)
            json_resp = json.loads(resp.content)
            assert json_resp['success'][0] == self.admin.email
            assert json_resp['failed'][0]['email'] == invalid_email

    def test_can_not_send_email_if_not_link_owner(self):
        self.logout()
        self.login_as(self.admin)
        url = reverse("api2-send-upload-link")
        data = {
            "token": self.token,
            "email": self.admin.email,
        }

        resp = self.client.post(url, data)
        self.assertEqual(403, resp.status_code)
