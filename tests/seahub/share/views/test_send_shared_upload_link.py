from mock import patch
from django.core import mail
from django.urls import reverse
from django.test import override_settings

from seahub.profile.models import Profile
from seahub.profile.utils import refresh_cache
from seahub.test_utils import BaseTestCase


class SendSharedUploadLinkTest(BaseTestCase):
    def setUp(self):
        mail.outbox = []

    @override_settings(DEFAULT_FROM_EMAIL='from_noreply@seafile.com')
    @patch('seahub.share.views.IS_EMAIL_CONFIGURED', True)
    def test_can_send(self):
        self.login_as(self.user)

        resp = self.client.post(reverse('send_shared_upload_link'), {
            'email': self.user.email,
            'shared_upload_link': 'http://xxx',
            'extra_msg': ''
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        self.assertEqual(200, resp.status_code)
        self.assertEqual(len(mail.outbox), 1)
        assert '<a href="http://xxx">http://xxx</a>' in mail.outbox[0].body
        assert mail.outbox[0].from_email == 'from_noreply@seafile.com'

    @patch('seahub.share.views.REPLACE_FROM_EMAIL', True)
    @patch('seahub.share.views.ADD_REPLY_TO_HEADER', True)
    @patch('seahub.share.views.IS_EMAIL_CONFIGURED', True)
    @patch('seahub.utils.IS_EMAIL_CONFIGURED', True)
    def test_can_send_from_replyto_rewrite(self):
        self.login_as(self.user)

        resp = self.client.post(reverse('send_shared_upload_link'), {
            'email': self.user.email,
            'shared_upload_link': 'http://xxx',
            'extra_msg': ''
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        self.assertEqual(200, resp.status_code)
        self.assertEqual(len(mail.outbox), 1)
        assert '<a href="http://xxx">http://xxx</a>' in mail.outbox[0].body
        assert mail.outbox[0].from_email == self.user.email
        assert mail.outbox[0].extra_headers['Reply-to'] == self.user.email

    @patch('seahub.share.views.REPLACE_FROM_EMAIL', True)
    @patch('seahub.share.views.ADD_REPLY_TO_HEADER', True)
    @patch('seahub.share.views.IS_EMAIL_CONFIGURED', True)
    @patch('seahub.utils.IS_EMAIL_CONFIGURED', True)
    def test_can_send_from_replyto_rewrite_contact_email(self):
        self.login_as(self.user)
        nickname = 'Testuser'
        contact_email= 'contact_email@test.com'
        p = Profile.objects.add_or_update(self.user.email, nickname=nickname)
        p.contact_email = contact_email
        p.save()

        refresh_cache(self.user.email)

        resp = self.client.post(reverse('send_shared_upload_link'), {
            'email': self.user.email,
            'shared_upload_link': 'http://xxx',
            'extra_msg': ''
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        self.assertEqual(200, resp.status_code)
        self.assertEqual(len(mail.outbox), 1)
        assert '<a href="http://xxx">http://xxx</a>' in mail.outbox[0].body
        assert mail.outbox[0].from_email == contact_email
        assert mail.outbox[0].extra_headers['Reply-to'] == contact_email
