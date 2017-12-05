from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase


class ProfileManagerTest(BaseTestCase):
    def setUp(self):
        pass

    def test_get_contact_email_by_user(self):
        # no profile for user, contact email should be username
        username = self.user.username
        assert username == Profile.objects.get_contact_email_by_user(username)

        # user has profile, but no contact email, contact email should be username
        p = Profile.objects.add_or_update(username, 'nickname')
        assert username == Profile.objects.get_contact_email_by_user(username)

        # user has profile, and have contact email
        p.contact_email = 'contact@foo.com'
        p.save()
        assert 'contact@foo.com' == Profile.objects.get_contact_email_by_user(username)

    def test_add_or_update(self):
        username = self.user.username
        profiles = Profile.objects.filter(user=username)
        for profile in profiles:
            profile.delete()

        profile = Profile.objects.add_or_update(username, 'nickname',
                                                intro='hello', lang_code='ch',
                                                login_id=username,
                                                contact_email=username,
                                                institution='test')
        assert profile.nickname == 'nickname'
        assert profile.user == username
        assert profile.intro == 'hello'
        assert profile.lang_code == 'ch'
        assert profile.login_id == username
        assert profile.contact_email == username
        assert profile.institution == 'test'

        # test whether other will be changed when some one updated
        profile = Profile.objects.add_or_update(username, 'nick')
        assert profile.nickname == 'nick'
        assert profile.user == username
        assert profile.intro == 'hello'
        assert profile.lang_code == 'ch'
        assert profile.login_id == username
        assert profile.contact_email == username
        assert profile.institution == 'test'

        profile = Profile.objects.add_or_update(username, intro='intro')
        assert profile.nickname == 'nick'
        assert profile.user == username
        assert profile.intro == 'intro'
        assert profile.lang_code == 'ch'
        assert profile.login_id == username
        assert profile.contact_email == username
        assert profile.institution == 'test'

        profile = Profile.objects.add_or_update(username, lang_code='en')
        assert profile.nickname == 'nick'
        assert profile.user == username
        assert profile.intro == 'intro'
        assert profile.lang_code == 'en'
        assert profile.login_id == username
        assert profile.contact_email == username
        assert profile.institution == 'test'

        profile = Profile.objects.add_or_update(username, login_id='test@test.com')
        assert profile.nickname == 'nick'
        assert profile.user == username
        assert profile.intro == 'intro'
        assert profile.lang_code == 'en'
        assert profile.login_id == 'test@test.com'
        assert profile.contact_email == username
        assert profile.institution == 'test'

        profile = Profile.objects.add_or_update(username, contact_email='test@contact.com')
        assert profile.nickname == 'nick'
        assert profile.user == username
        assert profile.intro == 'intro'
        assert profile.lang_code == 'en'
        assert profile.login_id == 'test@test.com'
        assert profile.contact_email == 'test@contact.com'
        assert profile.institution == 'test'

        profile = Profile.objects.add_or_update(username, institution='insti')
        assert profile.nickname == 'nick'
        assert profile.user == username
        assert profile.intro == 'intro'
        assert profile.lang_code == 'en'
        assert profile.login_id == 'test@test.com'
        assert profile.contact_email == 'test@contact.com'
        assert profile.institution == 'insti'

    def test_add_or_update_with_empty(self):
        username = self.user.username
        profiles = Profile.objects.filter(user=username)
        for profile in profiles:
            profile.delete()

        profile = Profile.objects.add_or_update(username, 'nickname',
                                                intro='hello', lang_code='ch',
                                                login_id=username,
                                                contact_email=username,
                                                institution='test')
        assert profile.nickname == 'nickname'
        assert profile.user == username
        assert profile.intro == 'hello'
        assert profile.lang_code == 'ch'
        assert profile.login_id == username
        assert profile.contact_email == username
        assert profile.institution == 'test'

        profile = Profile.objects.add_or_update(username, '')
        assert profile.nickname == ''

        profile = Profile.objects.add_or_update(username, intro='')
        assert profile.intro == ''

        profile = Profile.objects.add_or_update(username, lang_code='')
        assert profile.lang_code == ''

        profile = Profile.objects.add_or_update(username, login_id='')
        assert profile.login_id == ''

        profile = Profile.objects.add_or_update(username, contact_email='')
        assert profile.contact_email == ''
