import json
from django.utils import timezone
from django.core.urlresolvers import reverse

from seahub.invitations.models import Invitation
from seahub.notifications.models import UserNotification
from seahub.test_utils import BaseTestCase


class TokenViewTest(BaseTestCase):
    def setUp(self):
        self.accepter = 'random@foo.com'
        self.iv = Invitation.objects.add(inviter=self.user.username,
                                         accepter=self.accepter)
        self.url = reverse('invitations:token_view', args=[self.iv.token])

    def tearDown(self):
        self.remove_user(self.accepter)

    def test_get(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        self.assertRegexpMatches(resp.content, 'Set your password')

    def test_expired_token(self):
        self.iv.expire_time = timezone.now()
        self.iv.save()
        resp = self.client.get(self.url)
        self.assertEqual(404, resp.status_code)

    def test_post(self):
        assert self.iv.accept_time is None
        resp = self.client.post(self.url, {
            'password': 'passwd'
        })
        self.assertEqual(302, resp.status_code)
        assert Invitation.objects.get(pk=self.iv.pk).accept_time is not None

    def test_post_empty_password(self):
        assert self.iv.accept_time is None
        resp = self.client.post(self.url, {
            'password': '',
        })
        self.assertEqual(302, resp.status_code)
        assert Invitation.objects.get(pk=self.iv.pk).accept_time is None

    def test_can_notify_inviter(self):
        assert len(UserNotification.objects.filter(to_user=self.user.username)) == 0
        resp = self.client.post(self.url, {
            'password': 'passwd'
        })
        self.assertEqual(302, resp.status_code)

        assert len(UserNotification.objects.filter(to_user=self.user.username)) == 1
        obj = UserNotification.objects.all()[0]
        d = json.loads(obj.detail)
        assert d['invitation_id'] == self.iv.pk
