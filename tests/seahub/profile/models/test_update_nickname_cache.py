from django.core.cache import cache

from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile
from seahub.profile.settings import NICKNAME_CACHE_PREFIX, CONTACT_CACHE_PREFIX
from seahub.profile.utils import get_profile_cache_key
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

    def test_cache_key_is_case_insensitive(self):
        username = self.tmp_user.username
        assert get_profile_cache_key(username, NICKNAME_CACHE_PREFIX) == \
            get_profile_cache_key(username.upper(), NICKNAME_CACHE_PREFIX)
        assert get_profile_cache_key(username, CONTACT_CACHE_PREFIX) == \
            get_profile_cache_key(username.upper(), CONTACT_CACHE_PREFIX)

    def test_read_with_different_email_casing_uses_same_nickname_cache(self):
        username = self.tmp_user.username
        Profile.objects.add_or_update(username, 'nickname')

        assert email2nickname(username.upper()) == 'nickname'
        assert email2nickname(username) == 'nickname'

    def test_profile_update_deletes_cached_nickname_and_contact_email(self):
        username = self.tmp_user.username
        nickname_key = get_profile_cache_key(username.upper(), NICKNAME_CACHE_PREFIX)
        contact_key = get_profile_cache_key(username.upper(), CONTACT_CACHE_PREFIX)
        cache.set(nickname_key, 'old nickname')
        cache.set(contact_key, 'old@example.com')

        Profile.objects.add_or_update(username, 'new nickname',
                                      contact_email='new@example.com')

        assert cache.get(nickname_key) is None
        assert cache.get(contact_key) is None
