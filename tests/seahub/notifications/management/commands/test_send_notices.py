# encoding: utf-8
from django.core import mail
from django.core.management import call_command

from seahub.invitations.models import Invitation
from seahub.notifications.models import (
    UserNotification, repo_share_msg_to_json, file_comment_msg_to_json,
    guest_invitation_accepted_msg_to_json, repo_share_to_group_msg_to_json)
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from seahub.share.utils import share_dir_to_user, share_dir_to_group


class CommandTest(BaseTestCase):

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
                                          self.user.username, 'test comment')
        UserNotification.objects.add_file_comment_msg('a@a.com', detail)

        call_command('send_notices')
        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == 'a@a.com'
        assert 'new comment from user %s' % self.user.username in mail.outbox[0].body
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
