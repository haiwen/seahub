from django.core.urlresolvers import reverse

import seaserv

from seahub.wiki.models import PersonalWiki
from seahub.test_utils import BaseTestCase

class PersonalWikiTest(BaseTestCase):
    def test_wiki_does_not_exist(self):
        self.login_as(self.user)
        resp = self.client.get(reverse('personal_wiki'))

        assert resp.context['wiki_exists'] is False
        self.assertTemplateUsed('wiki/personal_wiki.html')

    def test_home_page_missing(self):
        self.login_as(self.user)
        PersonalWiki.objects.save_personal_wiki(self.user.username,
                                                self.repo.id)
        assert len(PersonalWiki.objects.all()) == 1

        resp = self.client.get(reverse('personal_wiki'))
        self.assertEqual(302, resp.status_code)

    def test_invalid_permisison(self):
        self.login_as(self.admin)

        data = {'dst_repo': self.repo.id}
        resp = self.client.post(reverse('personal_wiki_use_lib'), data)
        assert 'Permission denied.' in str(resp.cookies)
        self.assertEqual(302, resp.status_code)

    def test_invalid_repo(self):
        self.login_as(self.user)

        data = {'dst_repo': self.repo.id[:30] + '123456'}
        resp = self.client.post(reverse('personal_wiki_use_lib'), data)
        assert 'Failed to set wiki library.' in str(resp.cookies)
        self.assertEqual(302, resp.status_code)

    def test_home_page(self):
        self.login_as(self.user)
        PersonalWiki.objects.save_personal_wiki(self.user.username,
                                                self.repo.id)
        assert len(PersonalWiki.objects.all()) == 1

        seaserv.post_empty_file(self.repo.id, "/", "home.md",
                                self.user.username)

        for page_name in ["home", "home.md"]:
            resp = self.client.get(reverse('personal_wiki', args=[page_name]))
            self.assertEqual(200, resp.status_code)
            self.assertTemplateUsed('wiki/personal_wiki.html')
            self.assertEqual(True, resp.context['wiki_exists'])
            self.assertEqual("home", resp.context['page'])
            self.assertEqual("/home.md", resp.context['path'])
