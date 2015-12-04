from seahub.test_utils import BaseTestCase
from seahub.options.models import (UserOptions, KEY_USER_GUIDE,
                                   VAL_USER_GUIDE_ON, VAL_USER_GUIDE_OFF)

class UserOptionsManagerTest(BaseTestCase):
    def test_is_user_guide_enabled(self):
        assert UserOptions.objects.is_user_guide_enabled(self.user.email) is True

        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_USER_GUIDE,
                                   option_val=VAL_USER_GUIDE_OFF)

        assert UserOptions.objects.is_user_guide_enabled(self.user.email) is False

    def test_is_user_guide_enabled_with_multiple_records(self):
        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_USER_GUIDE,
                                   option_val=VAL_USER_GUIDE_OFF)
        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_USER_GUIDE,
                                   option_val=VAL_USER_GUIDE_ON)

        assert len(UserOptions.objects.filter(email=self.user.email,
                                              option_key=KEY_USER_GUIDE)) == 2
        assert UserOptions.objects.is_user_guide_enabled(self.user.email) is True
        assert len(UserOptions.objects.filter(email=self.user.email,
                                              option_key=KEY_USER_GUIDE)) == 1
