import json

from django.utils import timezone
from django.urls import reverse
from django.core import mail
from django.test import override_settings

from seahub.auth.utils import get_virtual_id_by_email
from seahub.base.accounts import User
from seahub.constants import DEFAULT_USER
from seahub.invitations.models import Invitation
from seahub.notifications.models import UserNotification
from seahub.test_utils import BaseTestCase
from registration import signals
from tests.common.utils import randstring



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
        self.assertRegex(resp.content, b'Set your password')

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

    def _send_signal(self):
        signals.user_registered.send(sender=self.__class__,
                                     user=self.user,
                                     request=self.fake_request)

    @override_settings(
                NOTIFY_ADMIN_AFTER_REGISTRATION=True,
            )
    def test_notify_admin_after_registration(self):
        self.assertEqual(len(mail.outbox), 0)
        self._send_signal()

        assert 'New account created' in mail.outbox[0].subject
        assert '%s is joined' % self.user.email in mail.outbox[0].body

        assert len(mail.outbox) > 0


class DefaultInvitationTokenViewTest(BaseTestCase):

    def setUp(self):
        self.accepter = 'default-%s@foo.com' % randstring(8)
        self.user_obj = User.objects.create_user(
            self.accepter, None, is_staff=False, is_active=False)
        self.iv = Invitation.objects.add(
            inviter=self.user.username,
            accepter=self.accepter,
            invite_type=DEFAULT_USER,
        )
        self.url = reverse('invitations:token_view', args=[self.iv.token])

    def tearDown(self):
        self.remove_user(self.user_obj.username)

    def test_post_activates_default_user(self):
        resp = self.client.post(self.url, {'password': 'passwd'})
        self.assertEqual(302, resp.status_code)

        user = User.objects.get(email=self.user_obj.username)
        self.assertTrue(user.is_active)
        self.assertEqual(user.role, DEFAULT_USER)
        self.assertIsNotNone(Invitation.objects.get(pk=self.iv.pk).accept_time)

    def test_does_not_notify_as_guest(self):
        self.assertEqual(
            UserNotification.objects.filter(to_user=self.user.username).count(),
            0,
        )

        resp = self.client.post(self.url, {'password': 'passwd'})
        self.assertEqual(302, resp.status_code)
        self.assertEqual(
            UserNotification.objects.filter(to_user=self.user.username).count(),
            0,
        )

    def test_post_creates_default_user_when_missing(self):
        accepter = 'new-%s@foo.com' % randstring(8)
        invitation = Invitation.objects.add(
            inviter=self.user.username,
            accepter=accepter,
            invite_type=DEFAULT_USER,
        )
        url = reverse('invitations:token_view', args=[invitation.token])

        resp = self.client.post(url, {'password': 'passwd'})
        self.assertEqual(302, resp.status_code)

        user = User.objects.get(email=get_virtual_id_by_email(accepter))
        self.assertTrue(user.is_active)
        self.assertEqual(user.role, DEFAULT_USER)

        self.remove_user(user.username)
