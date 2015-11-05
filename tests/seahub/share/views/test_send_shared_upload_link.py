from mock import patch
from django.core import mail
from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase


class SendSharedUploadLinkTest(BaseTestCase):
    def setUp(self):
        mail.outbox = []

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
