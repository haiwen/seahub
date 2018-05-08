from django.core.urlresolvers import reverse

from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

class EditProfileTest(BaseTestCase):
    def setUp(self):
        self.tmp_user = self.create_user('user_%s@test.com' % randstring(4),
                                         is_staff=False)
        assert len(Profile.objects.all()) == 0

        self.url = reverse('edit_profile')
        self.login_as(self.tmp_user)

    def tearDown(self):
        self.remove_user(self.tmp_user.username)

    def test_can_render_edit_page(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'profile/set_profile.html')

    def test_can_edit(self):
        assert email2nickname(self.tmp_user.username) == self.tmp_user.username.split('@')[0]

        resp = self.client.post(self.url, {
            'nickname': 'new nickname'
        })
        self.assertEqual(302, resp.status_code)
        self.assertRegexpMatches(resp['Location'], r'/profile/')
        assert email2nickname(self.tmp_user.username) == 'new nickname'
