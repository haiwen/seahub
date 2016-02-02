import json

from django.core.urlresolvers import reverse

from seahub.group.models import GroupMessage
from seahub.test_utils import BaseTestCase

class GroupDiscussionTest(BaseTestCase):
    def setUp(self):
        self.username = self.user.username
        self.login_as(self.user)
        self.discuss = GroupMessage.objects.create(group_id=self.group.id,
                                                   from_email=self.username,
                                                   message="msg 1")
        self.endpoint = reverse('api2-group-discussion', args=[
            self.group.id, self.discuss.pk])

    def test_can_delete_discussion(self):
        assert len(GroupMessage.objects.all()) == 1

        resp = self.client.delete(self.endpoint)
        self.assertEqual(204, resp.status_code)

        assert len(GroupMessage.objects.all()) == 0

    def test_can_not_delete_discussion_when_invalid_user(self):
        self.logout()

        self.login_as(self.admin)
        resp = self.client.delete(self.endpoint)
        self.assertEqual(403, resp.status_code)
