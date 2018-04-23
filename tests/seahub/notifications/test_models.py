from seahub.notifications.models import (
    UserNotification, repo_share_msg_to_json, file_comment_msg_to_json,


)
from seahub.test_utils import BaseTestCase


class UserNotificationTest(BaseTestCase):
    def test_format_file_comment_msg(self):
        detail = file_comment_msg_to_json(self.repo.id, self.file,
                                          self.user.username, 'test comment')
        notice = UserNotification.objects.add_file_comment_msg('a@a.com', detail)

        msg = notice.format_file_comment_msg()
        assert msg is not None
        assert 'new comment from user' in msg

    def test_format_repo_share_msg(self):
        notice = UserNotification.objects.add_repo_share_msg(
            self.user.username,
            repo_share_msg_to_json('bar@bar.com', self.repo.id, '/', None))

        msg = notice.format_repo_share_msg()
        assert msg is not None
        assert 'bar has shared a library named' in msg

    def test_format_repo_share_msg_with_folder(self):
        folder_path = self.folder
        notice = UserNotification.objects.add_repo_share_msg(
            self.user.username,
            repo_share_msg_to_json('bar@bar.com', self.repo.id, folder_path, None))

        msg = notice.format_repo_share_msg()
        assert msg is not None
        print msg
        assert 'bar has shared a library named' in msg
