from seahub.test_utils import BaseTestCase
from seahub.base.accounts import User

from post_office.models import Email

class UserTest(BaseTestCase):
    def test_freeze_user(self):
        assert len(Email.objects.all()) == 0

        u = User.objects.get(self.user.username)
        u.freeze_user(notify_admins=True)

        assert u.is_active is False

        assert len(Email.objects.all()) > 0
        # email = Email.objects.all()[0]
        # print email.html_message
