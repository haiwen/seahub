from django.http import HttpResponse
from django.urls import reverse
from unittest.mock import patch

from seahub.auth.models import SocialAuthUser
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

    @patch('seahub.profile.views.render', return_value=HttpResponse())
    @patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', True)
    def test_remote_user_cannot_update_local_password(self, mock_render):
        SocialAuthUser.objects.add(self.tmp_user.username, 'saml', self.tmp_user.username)

        resp = self.client.get(self.url)

        self.assertEqual(200, resp.status_code)
        self.assertFalse(mock_render.call_args.args[2]['can_update_password'])

    def test_can_edit(self):
        assert email2nickname(self.tmp_user.username) == self.tmp_user.username.split('@')[0]

        resp = self.client.post(self.url, {
            'nickname': 'new nickname'
        })
        self.assertEqual(302, resp.status_code)
        self.assertRegex(resp['Location'], r'/profile/')
        assert email2nickname(self.tmp_user.username) == 'new nickname'
