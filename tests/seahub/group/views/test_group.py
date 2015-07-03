import json

from django.test import TestCase
from django.core.urlresolvers import reverse
import requests

from seahub.group.models import PublicGroup
from seahub.share.models import FileShare
from seahub.test_utils import Fixtures

from tests.common.utils import randstring

class GroupAddTest(TestCase, Fixtures):
    def test_can_add(self):
        self.client.post(
            reverse('auth_login'), {'username': self.user.username,
                                    'password': 'secret'}
        )

        resp = self.client.post(reverse('group_add'), {
            'group_name': 'test_group_%s' % randstring(6)
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        assert json.loads(resp.content)['success'] is True

class GroupDiscussTest(TestCase, Fixtures):
    def setUp(self):
        grp = self.group

    def tearDown(self):
        self.remove_group()

    def test_can_render(self):
        self.client.post(
            reverse('auth_login'), {'username': self.user.username,
                                    'password': 'secret'}
        )

        resp = self.client.get(reverse('group_discuss', args=[self.group.id]))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'group/group_discuss.html')

    def test_public_group_404(self):
        self.pub_grp = PublicGroup(group_id=self.group.id).save()

        self.client.post(
            reverse('auth_login'), {'username': self.user.username,
                                    'password': 'secret'}
        )

        resp = self.client.get(reverse('group_discuss', args=[self.group.id]))
        assert resp.status_code == 404
