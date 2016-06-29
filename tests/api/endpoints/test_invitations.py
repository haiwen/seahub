import json

from post_office.models import Email
from django.core.urlresolvers import reverse

from seahub.invitations.models import Invitation
from seahub.test_utils import BaseTestCase

class InvitationsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = '/api/v2.1/invitations/'
        self.username = self.user.username

    def test_can_add(self):
        assert len(Invitation.objects.all()) == 0
        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': 'some_random_user@1.com',
        })
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['accepter_exists'] is False
        assert json_resp['invitation']['inviter'] == self.username
        assert json_resp['invitation']['accepter'] == 'some_random_user@1.com'

        assert len(Invitation.objects.all()) == 1

    def test_can_send_mail(self):
        self.assertEqual(len(Email.objects.all()), 0)

        resp = self.client.post(self.endpoint, {
            'type': 'guest',
            'accepter': 'some_random_user@1.com',
        })
        self.assertEqual(201, resp.status_code)
        json_resp = json.loads(resp.content)

        self.assertEqual(len(Email.objects.all()), 1)
        self.assertRegexpMatches(Email.objects.all()[0].html_message,
                                 json_resp['invitation']['token'])

    def test_can_list(self):
        Invitation.objects.add(inviter=self.username, accepter='1@1.com')
        Invitation.objects.add(inviter=self.username, accepter='1@2.com')

        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['invitations']) == 2
