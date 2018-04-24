from seahub.notifications.models import (
    UserNotification, repo_share_msg_to_json, file_comment_msg_to_json,
    repo_share_to_group_msg_to_json
)
from seahub.share.utils import share_dir_to_user, share_dir_to_group
from seahub.test_utils import BaseTestCase


class UserNotificationTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()

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
        share_dir_to_user(self.repo, folder_path, self.user.username,
                          self.user.username, 'bar@bar.com', 'rw', None)
        notice = UserNotification.objects.add_repo_share_msg(
            'bar@bar.com',
            repo_share_msg_to_json(self.user.username, self.repo.id, folder_path, None))
        msg = notice.format_repo_share_msg()

        assert msg is not None
        assert 'test has shared a folder named' in msg

    def test_format_repo_share_to_group_msg(self):
        notice = UserNotification.objects.add_repo_share_msg(
            self.user.username,
            repo_share_to_group_msg_to_json('bar@bar.com', self.repo.id, self.group.id, '/', None))

        msg = notice.format_repo_share_to_group_msg()
        assert msg is not None
        assert 'bar has shared a library named' in msg

    def test_format_repo_share_to_group_msg_with_folder(self):
        folder_path = self.folder
        share_dir_to_group(self.repo, folder_path, self.user.username,
                          self.user.username, self.group.id, 'rw', None)
        notice = UserNotification.objects.add_repo_share_msg(
            'bar@bar.com',
            repo_share_to_group_msg_to_json(self.user.username, self.repo.id, self.group.id, folder_path, None))
        msg = notice.format_repo_share_to_group_msg()

        assert msg is not None
        assert 'test has shared a folder named' in msg 
