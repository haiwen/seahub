from django.core.urlresolvers import reverse

from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase

class UserSearchTest(BaseTestCase):
    def setUp(self):
        self.user_name = self.user.username

    def test_can_search_user_from_ccnet(self):
        self.login_as(self.admin)

        q = self.user_name[:3]
        resp = self.client.get(reverse('user_search') + '?email=%s' % q)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/user_search.html')
        self.assertContains(resp, self.user_name)

    def test_can_search_user_from_profile_by_name(self):
        self.login_as(self.admin)

        nickname = 'nickname'
        p = Profile.objects.add_or_update(self.user_name, nickname=nickname)
        p.save()

        resp = self.client.get(reverse('user_search') + '?email=%s' % nickname)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/user_search.html')
        self.assertContains(resp, self.user_name)

    def test_can_search_user_from_profile_by_contact_email(self):
        self.login_as(self.admin)

        contact_email= 'contact@email.com'
        p = Profile.objects.add_or_update(self.user_name, nickname='nickname')
        p.contact_email = contact_email
        p.save()

        resp = self.client.get(reverse('user_search') +
                '?email=%s' % contact_email)

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/user_search.html')
        self.assertContains(resp, self.user_name)

    def test_search_user_with_invalid_user_permission(self):
        self.login_as(self.user)

        resp = self.client.get(reverse('user_search') +
                '?email=%s' % self.user_name)

        self.assertEqual(404, resp.status_code)

    def test_search_invalid_user(self):
        self.login_as(self.admin)

        invalid_user = 'some_invalid_user@a.com'
        resp = self.client.get(reverse('user_search') + '?email=%s' % invalid_user)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/user_search.html')
        self.assertContains(resp, invalid_user)
