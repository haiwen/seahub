import json

from django.core.urlresolvers import reverse
import requests

from seahub.group.models import PublicGroup
from seahub.share.models import FileShare
from seahub.test_utils import BaseTestCase

from tests.common.utils import randstring

class GroupAddTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def test_can_add(self):
        resp = self.client.post(reverse('group_add'), {
            'group_name': 'test_group_%s' % randstring(6)
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        assert json.loads(resp.content)['success'] is True

    def test_can_add_with_blank(self):
        resp = self.client.post(reverse('group_add'), {
            'group_name': 'test group %s' % randstring(6)
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        assert json.loads(resp.content)['success'] is True

    def test_can_add_with_hyphen(self):
        resp = self.client.post(reverse('group_add'), {
            'group_name': 'test-group-%s' % randstring(6)
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        assert json.loads(resp.content)['success'] is True

    def test_can_add_with_blank_and_hyphen(self):
        resp = self.client.post(reverse('group_add'), {
            'group_name': 'test-group %s' % randstring(6)
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        assert json.loads(resp.content)['success'] is True

    def test_can_not_add_with_invalid_name(self):
        resp = self.client.post(reverse('group_add'), {
            'group_name': 'test*group(name)'
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(400, resp.status_code)


class GroupDiscussTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def tearDown(self):
        self.remove_group()

    def test_can_render(self):
        resp = self.client.get(reverse('group_discuss', args=[self.group.id]))
        self.assertEqual(200, resp.status_code)
