#coding: UTF-8
import json
from django.core.urlresolvers import reverse
from seahub.utils import IS_EMAIL_CONFIGURED
from seahub.share.models import FileShare
from seahub.test_utils import BaseTestCase


class SendShareLinkApiTest(BaseTestCase):

    def setUp(self):
        fs = FileShare.objects.create_file_link(self.user.username,
                self.repo.id, self.file, None)

        self.token = fs.token

    def tearDown(self):
        self.remove_repo()

    def test_can_send_email(self):
        self.login_as(self.user)
        invalid_email = 'invalid'
        url = reverse("api2-send-share-link")
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
        self.login_as(self.admin)
        url = reverse("api2-send-share-link")
        data = {
            "token": self.token,
            "email": self.admin.email,
        }

        resp = self.client.post(url, data)
        self.assertEqual(403, resp.status_code)
