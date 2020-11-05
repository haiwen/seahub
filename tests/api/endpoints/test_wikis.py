import json
import copy
from mock import patch

from django.urls import reverse
from django.test import override_settings

import seaserv
from seaserv import seafile_api, ccnet_api

from seahub.share.utils import share_dir_to_user
from seahub.wiki.models import Wiki
from seahub.role_permissions.settings import ENABLED_ROLE_PERMISSIONS
from seahub.test_utils import BaseTestCase

TEST_CAN_PUBLISH_REPO_FALSE = copy.deepcopy(ENABLED_ROLE_PERMISSIONS)
TEST_CAN_PUBLISH_REPO_FALSE['default']['can_publish_repo'] = False

TEST_CAN_GENERATE_SHARE_LINK = copy.deepcopy(ENABLED_ROLE_PERMISSIONS)
TEST_CAN_GENERATE_SHARE_LINK['default']['can_generate_share_link'] = False

@override_settings(ENABLE_WIKI=True)
class WikisViewTest(BaseTestCase):
    def setUp(self):
        self.url = reverse('api-v2.1-wikis')
        self.login_as(self.user)

    def test_can_list(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['data']) == 0

        wiki = Wiki.objects.add('test wiki', self.user.username,
                                repo_id=self.repo.id)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['data']) == 1
        assert json_resp['data'][0]['name'] == wiki.name
        assert 'published/test-wiki' in json_resp['data'][0]['link']
        assert json_resp['data'][0]['owner'] == self.user.username
        print(json_resp['data'][0]['created_at'])
        assert json_resp['data'][0]['created_at'] is not None

    def test_can_list_others(self):
        self.logout()
        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['data']) == 0

        share_from = self.user.username
        share_to = self.admin.username
        share_dir_to_user(self.repo, '/', share_from, share_from, share_to, 'r')
        wiki = Wiki.objects.add('test wiki', self.user.username,
                                repo_id=self.repo.id)

        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['data']) == 1
        assert json_resp['data'][0]['name'] == wiki.name
        assert 'published/test-wiki' in json_resp['data'][0]['link']
        assert json_resp['data'][0]['owner'] == self.user.username

    def test_can_add(self):
        assert len(Wiki.objects.all()) == 0

        resp = self.client.post(self.url, {
            'repo_id': self.repo.id,
        })
        self.assertEqual(200, resp.status_code)

        assert len(Wiki.objects.all()) == 1
        w = Wiki.objects.all()[0]
        assert w.created_at is not None

    def test_403_when_add_wiki_with_can_publish_repo_false(self):
        with patch('seahub.role_permissions.utils.ENABLED_ROLE_PERMISSIONS', TEST_CAN_PUBLISH_REPO_FALSE):
            resp = self.client.post(self.url, {
                'repo_id': self.repo.id,
            })
            self.assertEqual(403, resp.status_code)

    @override_settings(ENABLE_WIKI=False)
    def test_403_when_add_wiki_with_enable_wiki_false(self):
        resp = self.client.post(self.url, {
            'repo_id': self.repo.id,
        })
        self.assertEqual(403, resp.status_code)

    def test_403_when_add_wiki_with_can_generate_share_link_false(self):
        with patch('seahub.role_permissions.utils.ENABLED_ROLE_PERMISSIONS', TEST_CAN_GENERATE_SHARE_LINK):
            resp = self.client.post(self.url, {
                'repo_id': self.repo.id,
            })
            self.assertEqual(403, resp.status_code)

class WikiViewTest(BaseTestCase):
    def setUp(self):
        wiki = Wiki.objects.add('test wiki', self.user.username,
                                repo_id=self.repo.id)

        self.url = reverse('api-v2.1-wiki', args=[wiki.slug])
        self.login_as(self.user)

    def test_can_delete(self):
        assert len(Wiki.objects.all()) == 1

        resp = self.client.delete(self.url)
        self.assertEqual(200, resp.status_code)

        assert len(Wiki.objects.all()) == 0

    def test_can_edit_wiki_perm(self):
        resp = self.client.put(self.url, "permission=public", 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp["permission"] == "public"

