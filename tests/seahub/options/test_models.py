from seahub.test_utils import BaseTestCase
from seahub.options.models import (UserOptions, KEY_USER_GUIDE,
                                   VAL_USER_GUIDE_ON, VAL_USER_GUIDE_OFF,
                                   KEY_DEFAULT_REPO)

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

    def test_get_default_repo(self):
        assert len(UserOptions.objects.filter(email=self.user.email, option_key=KEY_DEFAULT_REPO)) == 0

        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_DEFAULT_REPO,
                                   option_val=self.repo.id)

        assert len(UserOptions.objects.filter(email=self.user.email, option_key=KEY_DEFAULT_REPO)) == 1
        assert UserOptions.objects.get_default_repo(self.user.email) is not None

    def test_get_default_repo_with_multiple_records(self):
        assert len(UserOptions.objects.filter(email=self.user.email, option_key=KEY_DEFAULT_REPO)) == 0

        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_DEFAULT_REPO,
                                   option_val=self.repo.id)

        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_DEFAULT_REPO,
                                   option_val=self.repo.id)

        assert len(UserOptions.objects.filter(email=self.user.email, option_key=KEY_DEFAULT_REPO)) == 2
        assert UserOptions.objects.get_default_repo(self.user.email) is not None
        assert len(UserOptions.objects.filter(email=self.user.email, option_key=KEY_DEFAULT_REPO)) == 1
