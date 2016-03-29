import json

from django.core.urlresolvers import reverse

from seahub.group.models import GroupMessage
from seahub.test_utils import BaseTestCase

class GroupDiscussionsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.endpoint = reverse('api2-group-discussions', args=[self.group.id])
        self.username = self.user.username

    def test_can_list(self):
        GroupMessage(group_id=self.group.id, from_email=self.username,
                     message="msg 1").save()

        resp = self.client.get(self.endpoint)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['msgs']) == 1

    def test_can_list_with_paginator(self):
        for i in range(10):
            GroupMessage(group_id=self.group.id, from_email=self.username,
                         message="msg %s" % i).save()

        resp = self.client.get(self.endpoint + '?page=1&per_page=5')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['msgs']) == 5
        assert json_resp['msgs'][0]['content'] == 'msg 9'

        resp = self.client.get(self.endpoint + '?page=2&per_page=5')
        json_resp = json.loads(resp.content)
        assert len(json_resp['msgs']) == 5
        assert json_resp['msgs'][-1]['content'] == 'msg 0'

        resp = self.client.get(self.endpoint + '?page=3&per_page=5')
        json_resp = json.loads(resp.content)
        assert len(json_resp['msgs']) == 5
        assert json_resp['msgs'][-1]['content'] == 'msg 0'

    def test_can_not_list_when_invalid_user(self):
        self.logout()

        self.login_as(self.admin)
        resp = self.client.get(self.endpoint)
        self.assertEqual(403, resp.status_code)

    def test_can_post_a_discussion(self):
        assert len(GroupMessage.objects.all()) == 0
        resp = self.client.post(self.endpoint, {
            'content': 'msg 1'
        })
        self.assertEqual(201, resp.status_code)
        json_resp = json.loads(resp.content)

        assert len(GroupMessage.objects.all()) == 1
        assert json_resp['content'] == 'msg 1'

    def test_can_not_post_empty_content(self):
        resp = self.client.post(self.endpoint, {
            'content': ''
        })
        self.assertEqual(400, resp.status_code)

    def test_can_not_post_content_when_invalid_user(self):
        self.logout()

        self.login_as(self.admin)
        resp = self.client.post(self.endpoint, {
            'content': 'msg 1'
        })
        self.assertEqual(403, resp.status_code)
        
