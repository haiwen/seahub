from seahub.base.accounts import User
from seahub.test_utils import BaseTestCase
from seahub.utils.user import get_exist_user_emails, \
        get_exist_active_user_emails

class UserTest(BaseTestCase):

    def setUp(self):
        self.user1 = self.create_user()
        self.user2 = self.create_user()

    def tearDown(self):
        self.remove_user(self.user1.email)
        self.remove_user(self.user2.email)

    def test_get_exist_user_emails(self):

        email1 = self.user1.email
        email2 = self.user2.email

        email_list = [email1, email2]

        assert email1 in get_exist_user_emails(email_list)
        assert email2 in get_exist_user_emails(email_list)

    def test_get_exist_active_user_emails(self):

        email1 = self.user1.email
        email2 = self.user2.email

        user = User.objects.get(email2)
        user.is_active = 0
        user.save()

        email_list = [email1, email2]

        assert email1 in get_exist_active_user_emails(email_list)
        assert email2 not in get_exist_active_user_emails(email_list)
