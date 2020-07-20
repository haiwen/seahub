#coding: UTF-8
import json
from mock import patch
from django.core import mail
from django.urls import reverse
from django.test import override_settings

from seahub.utils import IS_EMAIL_CONFIGURED
from seahub.share.models import UploadLinkShare
from seahub.profile.models import Profile
from seahub.profile.utils import refresh_cache
from seahub.test_utils import BaseTestCase


class SendUploadLinkApiTest(BaseTestCase):

    def setUp(self):
        uls = UploadLinkShare.objects.create_upload_link_share(self.user.username,
                                                         self.repo.id, '/')
        self.token = uls.token

    def tearDown(self):
        self.remove_repo()

    @override_settings(DEFAULT_FROM_EMAIL='from_noreply@seafile.com')
    @patch('seahub.utils.IS_EMAIL_CONFIGURED', True)
    @patch('seahub.api2.endpoints.send_upload_link_email.IS_EMAIL_CONFIGURED', True)
    def test_can_send_email_configured(self):
        self.login_as(self.user)
        invalid_email = 'invalid'
        url = reverse("api2-send-upload-link")
        data = {
            "token": self.token,
            "email": self.admin.email + ',' + invalid_email,
        }

        resp = self.client.post(url, data)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(len(mail.outbox), 1)
        json_resp = json.loads(resp.content)
        assert json_resp['success'][0] == self.admin.email
        assert json_resp['failed'][0]['email'] == invalid_email
        assert mail.outbox[0].from_email == 'from_noreply@seafile.com'

    @patch('seahub.utils.IS_EMAIL_CONFIGURED', True)
    @patch('seahub.api2.endpoints.send_upload_link_email.IS_EMAIL_CONFIGURED', True)
    @patch('seahub.api2.endpoints.send_upload_link_email.REPLACE_FROM_EMAIL', True)
    @patch('seahub.api2.endpoints.send_upload_link_email.ADD_REPLY_TO_HEADER', True)
    def test_can_send_email_rewrite(self):
        self.login_as(self.user)
        url = reverse("api2-send-upload-link")
        data = {
            "token": self.token,
            "email": self.admin.email,
        }

        resp = self.client.post(url, data)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(len(mail.outbox), 1)
        json_resp = json.loads(resp.content)
        assert json_resp['success'][0] == self.admin.email
        assert mail.outbox[0].from_email == self.user.email
        assert mail.outbox[0].extra_headers['Reply-to'] == self.user.email

    @patch('seahub.utils.IS_EMAIL_CONFIGURED', True)
    @patch('seahub.api2.endpoints.send_upload_link_email.IS_EMAIL_CONFIGURED', True)
    @patch('seahub.api2.endpoints.send_upload_link_email.REPLACE_FROM_EMAIL', True)
    @patch('seahub.api2.endpoints.send_upload_link_email.ADD_REPLY_TO_HEADER', True)
    def test_can_send_email_rewrite_contact_email(self):
        self.login_as(self.user)
        nickname = 'Testuser'
        contact_email= 'contact_email@test.com'
        p = Profile.objects.add_or_update(self.user.email, nickname=nickname)
        p.contact_email = contact_email
        p.save()

        refresh_cache(self.user.email)

        url = reverse("api2-send-upload-link")
        data = {
            "token": self.token,
            "email": self.admin.email,
        }

        resp = self.client.post(url, data)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(len(mail.outbox), 1)
        json_resp = json.loads(resp.content)
        assert json_resp['success'][0] == self.admin.email
        assert mail.outbox[0].from_email == contact_email
        assert mail.outbox[0].extra_headers['Reply-to'] == contact_email

    @patch('seahub.utils.IS_EMAIL_CONFIGURED', False)
    @patch('seahub.api2.endpoints.send_upload_link_email.IS_EMAIL_CONFIGURED', False)
    def test_can_send_email_not_configured(self):
        self.login_as(self.user)
        invalid_email = 'invalid'
        url = reverse("api2-send-upload-link")
        data = {
            "token": self.token,
            "email": self.admin.email + ',' + invalid_email,
        }

        resp = self.client.post(url, data)
        self.assertEqual(403, resp.status_code)
        self.assertEqual(len(mail.outbox), 0)

    def test_can_not_send_email_if_not_link_owner(self):
        self.login_as(self.admin)
        url = reverse("api2-send-upload-link")
        data = {
            "token": self.token,
            "email": self.admin.email,
        }

        resp = self.client.post(url, data)
        self.assertEqual(403, resp.status_code)
        self.assertEqual(len(mail.outbox), 0)
