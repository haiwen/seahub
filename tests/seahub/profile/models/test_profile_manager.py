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
