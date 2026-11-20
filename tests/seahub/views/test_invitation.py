from unittest.mock import Mock, patch

from django.http import Http404
from django.test import SimpleTestCase

from seahub.constants import DEFAULT_USER, GUEST_USER
from seahub.invitations import views


class InvitationActivationTest(SimpleTestCase):
    def setUp(self):
        self.request = Mock(method='POST', POST={'password': 'test-password'})
        self.invitation = Mock(invite_type=DEFAULT_USER, accept_time=None,
                               accepter='invited@example.com')
        self.invitation.is_expired.return_value = False
        self.invitation.is_guest.side_effect = lambda: self.invitation.invite_type == GUEST_USER
        self.user = Mock(username='invited-user', is_active=False, role=DEFAULT_USER)

        patches = {
            'get_object_or_404': {'return_value': self.invitation},
            'get_virtual_id_by_email': {'return_value': self.user.username},
            'authenticate': {'return_value': self.user},
            'auth_login': {},
            'accept_guest_invitation_successful': {},
            'RepoShareInvitation': {},
            'messages': {},
            'render': {'return_value': 'rejected'},
            'NOTIFY_ADMIN_AFTER_REGISTRATION': {'new': False},
        }
        self.mocks = {}
        for name, kwargs in patches.items():
            patcher = patch.object(views, name, **kwargs)
            self.mocks[name] = patcher.start()
            self.addCleanup(patcher.stop)

        patcher = patch.object(views.User.objects, 'get', return_value=self.user)
        self.get_user = patcher.start()
        self.addCleanup(patcher.stop)
        patcher = patch.object(views.User.objects, 'update_role')
        self.update_role = patcher.start()
        self.addCleanup(patcher.stop)

    def assert_activation_succeeds(self):
        response = views.token_view(self.request, 'invitation-token')

        self.assertEqual(response.status_code, 302)
        self.user.set_password.assert_called_once_with('test-password')
        self.assertTrue(self.user.is_active)
        self.user.save.assert_called_once_with()
        self.invitation.accept.assert_called_once_with()
        self.mocks['auth_login'].assert_called_once_with(self.request, self.user)
        self.mocks['messages'].error.assert_not_called()

    def assert_activation_rejected(self):
        self.assertEqual(views.token_view(self.request, 'invitation-token'), 'rejected')
        self.user.set_password.assert_not_called()
        self.user.save.assert_not_called()
        self.invitation.accept.assert_not_called()
        self.mocks['auth_login'].assert_not_called()

    def test_admin_invitation_activates_regular_user_without_changing_role(self):
        # Organization and system administrators both create default invitations.
        self.assert_activation_succeeds()
        self.update_role.assert_not_called()
        self.mocks['accept_guest_invitation_successful'].send.assert_not_called()

    def test_admin_invitation_activates_user_with_implicit_default_role(self):
        self.user.role = ''
        self.assert_activation_succeeds()
        self.update_role.assert_called_once_with(self.user.username, DEFAULT_USER)

    def test_guest_invitation_does_not_activate_regular_user(self):
        self.invitation.invite_type = GUEST_USER
        self.assert_activation_rejected()
        self.assertFalse(self.user.is_active)
        self.mocks['messages'].error.assert_called_once()

    def test_guest_invitation_activates_guest_user(self):
        self.invitation.invite_type = GUEST_USER
        self.user.role = GUEST_USER
        self.assert_activation_succeeds()
        self.update_role.assert_not_called()
        self.mocks['accept_guest_invitation_successful'].send.assert_called_once_with(
            sender=None, invitation_obj=self.invitation)

    def test_invitation_does_not_reset_active_user_password(self):
        self.user.is_active = True
        self.assert_activation_rejected()

    def test_expired_invitation_is_rejected(self):
        self.invitation.is_expired.return_value = True
        with self.assertRaises(Http404):
            views.token_view(self.request, 'invitation-token')
        self.get_user.assert_not_called()

    def test_non_user_invitation_is_rejected(self):
        for invite_type in ('org', 'Organization', 'unknown'):
            with self.subTest(invite_type=invite_type):
                self.invitation.invite_type = invite_type
                with self.assertRaises(Http404):
                    views.token_view(self.request, 'invitation-token')
        self.get_user.assert_not_called()
        self.user.set_password.assert_not_called()
        self.mocks['auth_login'].assert_not_called()
