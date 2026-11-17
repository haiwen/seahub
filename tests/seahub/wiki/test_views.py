from django.urls import reverse

from seahub.wiki.models import Wiki
from seahub.test_utils import BaseTestCase


class SlugTest(BaseTestCase):
    def setUp(self, ):
        self.wiki = Wiki.objects.add('new wiki', self.user.username)
        self.login_as(self.user)

    # def test_home_page(self, ):
    #     resp = self.client.get(reverse('wiki:slug', args=['new-wiki']))
    #     self.assertEqual(200, resp.status_code)
    #     self.assertTemplateUsed(resp, 'wiki/wiki.html')

    def test_old_home_page(self, ):
        resp = self.client.get(reverse('wiki:slug', args=['new-wiki', 'home']))
        self.assertEqual(302, resp.status_code)
        self.assertRegex(resp['Location'], '/published/new-wiki/home.md')

    def test_old_wiki_shows_deprecated_notice(self):
        resp = self.client.get(reverse('wiki:slug', args=['new-wiki', 'home.md']))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'wiki/wiki_deprecated.html')
        self.assertContains(resp, 'Old Wiki is no longer supported')
        self.assertContains(resp, 'Content rendering is no longer supported')
