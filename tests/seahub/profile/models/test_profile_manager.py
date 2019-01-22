from seahub.profile.models import Profile, DuplicatedContactEmailError
from seahub.test_utils import BaseTestCase


class ProfileManagerTest(BaseTestCase):
    def setUp(self):
        pass

    def test_get_username_by_contact_email(self):
        assert Profile.objects.get_username_by_contact_email('a@a.com') is None

        user1 = self.user.username
        Profile.objects.add_or_update(user1, contact_email='a@a.com')
        assert Profile.objects.get_username_by_contact_email('a@a.com') == user1

        # user2 = self.admin.username
        # Profile.objects.add_or_update(user2, contact_email='a@a.com')
        # assert Profile.objects.get_username_by_contact_email('a@a.com') is None

    def test_convert_login_str_to_username(self):
        s = Profile.objects
        assert s.convert_login_str_to_username('a@a.com') == 'a@a.com'

        Profile.objects.add_or_update(username='a@a.com', login_id='aaa')
        assert s.convert_login_str_to_username('a@a.com') == 'a@a.com'
        assert s.convert_login_str_to_username('aaa') == 'a@a.com'

        Profile.objects.add_or_update(username='a@a.com', contact_email='a+1@a.com')
        assert s.convert_login_str_to_username('a@a.com') == 'a@a.com'
        assert s.convert_login_str_to_username('aaa') == 'a@a.com'
        assert s.convert_login_str_to_username('a+1@a.com') == 'a@a.com'

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

    def test_duplicated_contact_email(self, ):
        profile = Profile.objects.add_or_update('test@test.com', '',
                                                contact_email='a@a.com')

        try:
            _ = Profile.objects.add_or_update('1@1.com', '',
                                              contact_email='a@a.com')
        except DuplicatedContactEmailError:
            assert True
        else:
            assert False

    def test_updated_contact_email(self, ):
        _ = Profile.objects.add_or_update('1@1.com', '',
                                          contact_email='a@a.com')

        username = self.user.username
        profile = Profile.objects.add_or_update(username, '',
                                                contact_email='b@b.com')

        try:
            Profile.objects.update_contact_email(username, contact_email='a@a.com')
        except DuplicatedContactEmailError:
            assert True
        else:
            assert False
