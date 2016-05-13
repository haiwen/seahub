from django.utils import timezone
from django.test import override_settings

from seahub.invitations.models import Invitation
from seahub.test_utils import BaseTestCase


class InvitationTest(BaseTestCase):
    def test_is_expired(self):
        i = Invitation.objects.add('f@f.com', 'g@g.com')
        assert i.is_expired() is False

        i.expire_time = timezone.now()
        i.save()
        assert i.is_expired() is True


class InvitationManagerTest(BaseTestCase):
    def test_can_add(self):
        assert len(Invitation.objects.all()) == 0

        i = Invitation.objects.add('f@f.com', 'g@g.com')
        assert i is not None
        assert i.is_expired() is False

        assert len(Invitation.objects.all()) == 1
