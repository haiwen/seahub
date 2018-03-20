import json

from django.core.urlresolvers import reverse
import seaserv
from seaserv import seafile_api, ccnet_api

from seahub.wiki.models import Wiki
from seahub.test_utils import BaseTestCase


class WikiPagesViewTest(BaseTestCase):
    def setUp(self):
        self.wiki = Wiki.objects.add('test wiki pages', self.user.username,
                                repo_id=self.repo.id)

        self.url = reverse('api-v2.1-wiki-pages', args=[self.wiki.slug])

        seaserv.post_empty_file(self.repo.id, "/", "987.md",
                                self.user.username)
        seaserv.post_empty_file(self.repo.id, "/", "789.md",
                                self.user.username)

    def test_can_list_pages(self):
        self.login_as(self.user)

        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert len(json_resp['data']) == 2

    def test_can_list_public_wiki_pages(self):
        self.wiki.permission = 'public'
        self.wiki.save()

        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert len(json_resp['data']) == 2

    def test_can_add_page(self):
        self.login_as(self.user)

        resp = self.client.post(self.url, {
            'name': '2018',
        })
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['name'] == '2018'

    def test_list_pages_sorted_by_name(self):
        self.login_as(self.user)

        seaserv.post_empty_file(self.repo.id, "/", "issues.md",
                                self.user.username)
        seaserv.post_empty_file(self.repo.id, "/", "home.md",
                                self.user.username)
        seaserv.post_empty_file(self.repo.id, "/", "img test.md",
                                self.user.username)

        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        names = [e['name'] for e in json_resp['data']]
        assert names[0] == '789'
        assert names[-1] == 'issues'

class WikiPageViewTest(BaseTestCase):
    def setUp(self):

        self.wiki = Wiki.objects.add('test wiki page', self.user.username,
                                     repo_id=self.repo.id)
        self.url = reverse('api-v2.1-wiki-page', args=[self.wiki.slug, "home"])
        self.create_file_with_content(file_name='home.md',
                                      parent_dir='/',
                                      content='2018',
                                      username=self.user.username)

    def test_can_get_page_content(self):
        self.login_as(self.user)

        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert json_resp['content'] == '2018'
        assert json_resp['meta']['name'] == 'home'

    def test_can_get_public_page(self):
        self.wiki.permission = 'public'
        self.wiki.save()

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

    def test_can_delete_page(self):
        self.login_as(self.user)

        resp = self.client.delete(self.url)
        self.assertEqual(200, resp.status_code)
