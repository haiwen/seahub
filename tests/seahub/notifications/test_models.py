from seahub.notifications.models import (
    UserNotification, repo_share_msg_to_json, file_comment_msg_to_json,
    repo_share_to_group_msg_to_json, file_uploaded_msg_to_json,
    group_join_request_to_json, add_user_to_group_to_json, group_msg_to_json)
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

    def test_format_file_uploaded_msg(self):
        upload_to = '/'
        detail = file_uploaded_msg_to_json('upload_msg', self.repo.id, upload_to)
        notice = UserNotification.objects.add_file_uploaded_msg('file@upload.com', detail)

        msg = notice.format_file_uploaded_msg()
        assert '/library/%(repo_id)s/%(repo_name)s/%(path)s' % {'repo_id': self.repo.id,
                                                      'repo_name': self.repo.name,
                                                      'path': upload_to.strip('/')} in msg

    def test_format_group_join_request(self):
        detail = group_join_request_to_json('group_join', self.group.id, 'join_request_msg')
        notice = UserNotification.objects.add_group_join_request_notice('group_join',
                                                                        detail=detail)
        msg = notice.format_group_join_request()
        assert '/#group/%(group_id)s/members/' % {'group_id': self.group.id} in msg

    def test_format_add_user_to_group(self):
        detail = add_user_to_group_to_json(self.user.username, self.group.id)
        notice = UserNotification.objects.set_add_user_to_group_notice(self.user.username,
                                                                       detail=detail)
        msg = notice.format_add_user_to_group()
        assert '/group/%(group_id)s/' % {'group_id': self.group.id} in msg

    def test_format_repo_share_msg(self):
        notice = UserNotification.objects.add_repo_share_msg(
            self.user.username,
            repo_share_msg_to_json('bar@bar.com', self.repo.id, '/', None))

        msg = notice.format_repo_share_msg()
        assert msg is not None
        assert 'bar has shared a library named' in msg
        assert '/library/%(repo_id)s/%(repo_name)s/%(path)s' % {
                'repo_id': self.repo.id,
                'repo_name': self.repo.name,
                'path': ''} in msg

    def test_format_repo_share_msg_with_folder(self):
        folder_path = self.folder
        share_dir_to_user(self.repo, folder_path, self.user.username,
                          self.user.username, 'bar@bar.com', 'rw', None)
        notice = UserNotification.objects.add_repo_share_msg(
            self.user.username,
            repo_share_msg_to_json('bar@bar.com', self.repo.id, folder_path, None))
        msg = notice.format_repo_share_msg()

        assert msg is not None
        assert 'bar has shared a folder named' in msg

    def test_format_repo_share_to_group_msg(self):
        notice = UserNotification.objects.add_repo_share_to_group_msg(
            self.user.username,
            repo_share_to_group_msg_to_json('bar@bar.com', self.repo.id, self.group.id, '/', None))

        msg = notice.format_repo_share_to_group_msg()
        assert msg is not None
        assert 'bar has shared a library named' in msg
        assert '/group/%(group_id)s/' % {'group_id': self.group.id} in msg

    def test_format_repo_share_to_group_msg_with_folder(self):
        folder_path = self.folder
        share_dir_to_group(self.repo, folder_path, self.user.username,
                           self.user.username, self.group.id, 'rw', None)
        notice = UserNotification.objects.add_repo_share_to_group_msg(
            self.user.username,
            repo_share_to_group_msg_to_json('bar@bar.com', self.repo.id, self.group.id, folder_path, None))
        msg = notice.format_repo_share_to_group_msg()

        assert msg is not None
        assert 'bar has shared a folder named' in msg
