from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase

from tests.common.utils import randstring


class UpdateNicknameCacheTest(BaseTestCase):
    def setUp(self):
        self.tmp_user = self.create_user('user_%s@test.com' % randstring(4),
                                         is_staff=False)
        assert len(Profile.objects.all()) == 0

    def tearDown(self):
        self.remove_user(self.tmp_user.username)

    def test_update_when_call_object_method(self):
        username = self.tmp_user.username
        assert email2nickname(username) == username.split('@')[0]

        Profile.objects.add_or_update(username, 'nickname')
        assert email2nickname(username) == 'nickname'

    def test_updated_when_call_save(self):
        username = self.tmp_user.username
        assert email2nickname(username) == username.split('@')[0]

        p = Profile.objects.get_profile_by_user(username)
        if p is None:
            p = Profile(user=username)

        p.nickname = 'nickname'
        p.save()

        assert email2nickname(username) == 'nickname'
