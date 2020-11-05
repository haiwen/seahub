from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.profile.models import Profile

class I18nTest(BaseTestCase):

    def test_can_set_to_zh(self):
        resp = self.client.get(reverse('i18n') + '?lang=zh-cn')
        self.assertEqual(302, resp.status_code)
        assert resp.cookies['django_language'].value == 'zh-cn'

    def test_wrong_lang_code(self):
        resp = self.client.get(reverse('i18n') + '?lang=zh_CN')
        self.assertEqual(302, resp.status_code)
        assert resp.cookies['django_language'].value == 'en'

    def test_anonymous_user_profile(self):
        # Should not add profile record when user is anonymous.
        resp = self.client.get(reverse('i18n') + '?lang=zh-cn')
        self.assertEqual(302, resp.status_code)
        assert len(Profile.objects.all()) == 0

    def test_add_new_user_profile(self):
        # Should add new profile record.
        self.login_as(self.user)

        resp = self.client.get(reverse('i18n') + '?lang=zh-cn')
        self.assertEqual(302, resp.status_code)
        assert len(Profile.objects.all()) == 1
        assert Profile.objects.get_user_language(self.user.username) == 'zh-cn'

    def test_update_user_profile(self):
        # Should update exist profile record.
        self.login_as(self.user)

        Profile.objects.add_or_update(self.user.username, 'nickname', 'intro')
        assert len(Profile.objects.all()) == 1

        resp = self.client.get(reverse('i18n') + '?lang=zh-cn')
        self.assertEqual(302, resp.status_code)
        assert len(Profile.objects.all()) == 1
        assert Profile.objects.get_user_language(self.user.username) == 'zh-cn'
