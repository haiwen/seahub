# encoding: utf-8
from django.core import mail
from django.core.management import call_command

from seahub.invitations.models import Invitation
from seahub.notifications.models import (
    UserNotification, repo_share_msg_to_json, file_comment_msg_to_json,
    guest_invitation_accepted_msg_to_json, repo_share_to_group_msg_to_json,
    file_uploaded_msg_to_json, group_join_request_to_json,
    add_user_to_group_to_json, group_msg_to_json)
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from seahub.notifications.management.commands.send_notices import Command
from seahub.share.utils import share_dir_to_user, share_dir_to_group
from seahub.options.models import UserOptions

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False


class CommandTest(BaseTestCase):

    def setUp(self):
        super(CommandTest, self).setUp()
        UserOptions.objects.set_file_updates_email_interval(self.user.username, 3600)
        UserOptions.objects.set_collaborate_email_interval(self.user.username, 3600)

    def tearDown(self):
        UserOptions.objects.unset_file_updates_last_emailed_time(self.user.username)
        UserOptions.objects.unset_collaborate_last_emailed_time(self.user.username)
        super(CommandTest, self).tearDown()

    def test_can_send_repo_share_msg(self):
        self.assertEqual(len(mail.outbox), 0)
        UserNotification.objects.add_repo_share_msg(
            self.user.username, repo_share_msg_to_json('bar@bar.com', self.repo.id, '/', None))

        call_command('send_notices')
        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username
        assert 'bar has shared a library named' in mail.outbox[0].body

    def test_can_send_folder_share_msg(self):
        self.assertEqual(len(mail.outbox), 0)
        share_dir_to_user(self.repo, self.folder, 'bar@bar.com', 'bar@bar.com', self.user.username, 'rw', org_id=None)
        UserNotification.objects.add_repo_share_msg(
            self.user.username, repo_share_msg_to_json('bar@bar.com', self.repo.id, self.folder, None))

        call_command('send_notices')
        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username
        assert 'bar has shared a folder named' in mail.outbox[0].body

    def test_can_send_repo_share_to_group_msg(self):
        self.assertEqual(len(mail.outbox), 0)
        UserNotification.objects.add_repo_share_to_group_msg(
            self.user.username,
            repo_share_to_group_msg_to_json('bar@bar.com', self.repo.id, self.group.id, '/', None))

        call_command('send_notices')
        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username
        assert 'bar has shared a library named' in mail.outbox[0].body
        assert 'group/%d' % self.group.id in mail.outbox[0].body

    def test_can_send_folder_share_to_group_msg(self):
        folder_path = self.folder
        share_dir_to_group(self.repo, folder_path, self.user.username,
                           self.user.username, self.group.id, 'rw', None)
        UserNotification.objects.add_repo_share_to_group_msg(
            self.user.username,
            repo_share_to_group_msg_to_json('bar@bar.com', self.repo.id,
                                            self.group.id, folder_path, None))
        call_command('send_notices')
        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username
        assert 'bar has shared a folder named' in mail.outbox[0].body
        assert 'group/%d' % self.group.id in mail.outbox[0].body

    # def test_can_send_with_Chinese_lang(self):
    #      self.assertEqual(len(mail.outbox), 0)
    #      UserNotification.objects.add_repo_share_msg(
    #          self.user.username, repo_share_msg_to_json('bar@bar.com', self.repo.id, '/', None))
    #      Profile.objects.add_or_update(self.user.username, 'nickname', lang_code='zh-cn')

    #      call_command('send_notices')
    #      self.assertEqual(len(mail.outbox), 1)
    #      assert mail.outbox[0].to[0] == self.user.username
    #      assert u'bar 共享了资料库' in mail.outbox[0].body

    def test_can_send_to_contact_email(self):
        self.assertEqual(len(mail.outbox), 0)
        UserNotification.objects.add_repo_share_msg(
            self.user.username, repo_share_msg_to_json('bar@bar.com', self.repo.id, '/', None))
        p = Profile.objects.add_or_update(self.user.username, 'nickname')
        p.contact_email = 'contact@foo.com'
        p.save()

        call_command('send_notices')
        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == 'contact@foo.com'

    def test_send_file_comment_notice(self):
        self.assertEqual(len(mail.outbox), 0)

        detail = file_comment_msg_to_json(self.repo.id, '/foo',
                                          'bar@bar.com', 'test comment')
        UserNotification.objects.add_file_comment_msg(self.user.username, detail)

        call_command('send_notices')
        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username
        assert 'new comment from user %s' % 'bar@bar.com' in mail.outbox[0].body
        assert '/foo' in mail.outbox[0].body

    def test_send_guest_invitation_notice(self):
        self.assertEqual(len(mail.outbox), 0)

        inv = Invitation.objects.add(self.user.username, 'test@test.com')
        inv.accept()

        detail = guest_invitation_accepted_msg_to_json(inv.pk)
        UserNotification.objects.add_guest_invitation_accepted_msg(
            inv.inviter, detail)

        call_command('send_notices')
        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username
        assert 'Guest test@test.com' in mail.outbox[0].body

    def test_format_repo_share_msg(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        detail = repo_share_msg_to_json('share@share.com', self.repo.id, '', -1)
        notice = UserNotification.objects.add_repo_share_msg('to@to.com', detail)
        resp = Command().format_repo_share_msg(notice)

        assert resp.repo_url == '/library/%(repo_id)s/%(repo_name)s/%(path)s' % {
                'repo_id': self.repo.id, 'repo_name': self.repo.name, 'path': ''}

    def test_format_repo_share_to_group_msg(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        detail = repo_share_to_group_msg_to_json('repo@share.com', self.repo.id, self.group.id, '', -1)
        notice = UserNotification.objects.add_repo_share_to_group_msg('group@share.com', detail)
        resp = Command().format_repo_share_to_group_msg(notice)

        assert resp.repo_url == '/library/%(repo_id)s/%(repo_name)s/%(path)s' % {
                'repo_id': self.repo.id, 'repo_name': self.repo.name, 'path': ''}
        assert resp.group_url == '/group/%(group_id)s/' % {'group_id': self.group.id}

    def test_format_file_uploaded_msg(self):
        upload_to = '/'
        detail = file_uploaded_msg_to_json('upload_msg', self.repo.id, upload_to)
        notice = UserNotification.objects.add_file_uploaded_msg('file@upload.com', detail)
        resp = Command().format_file_uploaded_msg(notice)

        assert resp.folder_link == '/library/%(repo_id)s/%(repo_name)s/%(path)s' % {
                'repo_id': self.repo.id, 'repo_name': self.repo.name, 'path': upload_to.strip('/')}

    def test_format_group_join_request(self):
        detail = group_join_request_to_json('group_join', self.group.id, 'join_request_msg')
        notice = UserNotification.objects.add_group_join_request_notice('group_join',
                                                                        detail=detail)
        resp = Command().format_group_join_request(notice)

        assert resp.grpjoin_group_url == '/#group/%(group_id)s/members/' % {'group_id': self.group.id}

    def test_format_add_user_to_group(self):
        detail = add_user_to_group_to_json(self.user.username, self.group.id)
        notice = UserNotification.objects.set_add_user_to_group_notice(self.user.username,
                                                                       detail=detail)
        resp = Command().format_add_user_to_group(notice)

        assert resp.group_url == '/group/%(group_id)s/' % {'group_id': self.group.id}
