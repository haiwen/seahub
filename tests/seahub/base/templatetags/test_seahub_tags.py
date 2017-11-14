from seahub.test_utils import BaseTestCase

from seahub.base.templatetags.seahub_tags import email2nickname, \
    seahub_filesizeformat
from seahub.profile.models import Profile


class Email2nicknameTest(BaseTestCase):
    def test_profile_is_none(self):
        assert len(Profile.objects.all()) == 0

        assert email2nickname(self.user.username) == self.user.username.split('@')[0]

    def test_nickname_is_empty_string(self):
        Profile.objects.add_or_update(self.user.username, '')
        assert len(Profile.objects.all()) == 1
        assert Profile.objects.all()[0].nickname == ''

        assert email2nickname(self.user.username) == self.user.username.split('@')[0]

    def test_nickname_is_space(self):
        Profile.objects.add_or_update(self.user.username, ' ')
        assert len(Profile.objects.all()) == 1
        assert Profile.objects.all()[0].nickname == ''

        assert email2nickname(self.user.username) == self.user.username.split('@')[0]

    def test_nickname_contains_space(self):
        Profile.objects.add_or_update(self.user.username, ' foo bar ')
        assert len(Profile.objects.all()) == 1
        assert Profile.objects.all()[0].nickname == 'foo bar'

        assert email2nickname(self.user.username) == 'foo bar'


class SeahubFilesizeformatTest(BaseTestCase):
    def test_seahub_filesizeformat(self):
        assert seahub_filesizeformat(1) == u'1\xa0byte'
        assert seahub_filesizeformat(1000) == u'1.0\xa0KB'
        assert seahub_filesizeformat(1000000) == u'1.0\xa0MB'
        assert seahub_filesizeformat(1000000000) == u'1.0\xa0GB'
