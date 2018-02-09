import json

from django.core.urlresolvers import reverse
import seaserv
from seaserv import seafile_api, ccnet_api

from seahub.wiki.models import Wiki
from seahub.test_utils import BaseTestCase


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
        assert 'wikis/test-wiki' in json_resp['data'][0]['link']

    def test_can_add(self):
        assert len(Wiki.objects.all()) == 0

        resp = self.client.post(self.url, {
            'name': 'test wiki',
            'permission': 'private',
        })
        self.assertEqual(200, resp.status_code)

        assert len(Wiki.objects.all()) == 1


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

