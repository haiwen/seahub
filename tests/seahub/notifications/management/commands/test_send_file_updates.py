# encoding: utf-8
import time
import datetime
from mock import patch

from django.core import mail
from django.core.management import call_command
from django.utils import timezone
from django.test import override_settings

from seahub.test_utils import BaseTestCase
from seahub.options.models import UserOptions


class Record(object):
    def __init__(self, **entries):
        self.__dict__.update(entries)


class CommandTest(BaseTestCase):

    def _repo_evs(self, ):
        l = [
            {'username': self.user.username, 'commit_id': None, 'obj_type': u'repo', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'timestamp': datetime.datetime(2018, 11, 5, 6, 46, 2), 'op_type': u'create', 'path': u'/', 'id': 254L, 'op_user': u'foo@foo.com', u'repo_name': u'tests\\'},
            {'username': self.user.username, 'commit_id': None, 'obj_type': u'repo', 'repo_id': u'f8dc0bc8-eae0-4063-9beb-790071168794', 'timestamp': datetime.datetime(2018, 11, 6, 9, 52, 6), 'op_type': u'delete', 'path': u'/', 'id': 289L, 'op_user': u'foo@foo.com', u'repo_name': u'123'},
            {'username': self.user.username, 'commit_id': u'93fb5d8f07e03e5c947599cd7c948965426aafec', 'obj_type': u'repo', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'timestamp': datetime.datetime(2018, 11, 7, 2, 35, 34), u'old_repo_name': u'tests\\', 'op_type': u'rename', 'path': u'/', 'id': 306L, 'op_user': u'foo@foo.com', u'repo_name': u'tests\\123'},
            {'username': self.user.username, 'commit_id': None, 'obj_type': u'repo', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'timestamp': datetime.datetime(2018, 11, 7, 3, 13, 2), u'days': 0, 'op_type': u'clean-up-trash', 'path': u'/', 'id': 308L, 'op_user': u'foo@foo.com', u'repo_name': u'tests\\123'},
            {'username': self.user.username, 'commit_id': None, 'obj_type': u'repo', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'timestamp': datetime.datetime(2018, 11, 7, 3, 12, 43), u'days': 3, 'op_type': u'clean-up-trash', 'path': u'/', 'id': 307L, 'op_user': u'foo@foo.com', u'repo_name': u'tests\\123'},
        ]

        return [Record(**x) for x in l]

    def _dir_evs(self, ):
        l = [
            {'username': self.user.username, 'commit_id': u'8ff6473e9ef5229a632e1481a1b28d52673220ec', 'obj_type': u'dir', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'0000000000000000000000000000000000000000', 'timestamp': datetime.datetime(2018, 11, 6, 9, 10, 45), 'op_type': u'create', 'path': u'/xx', 'id': 260L, 'op_user': u'foo@foo.com', u'repo_name': u'tests\\'},

            {'username': self.user.username, 'commit_id': u'bb3ef321899d2f75ecf56098cb89e6b13c48cff9', 'obj_type': u'dir', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'0000000000000000000000000000000000000000', 'timestamp': datetime.datetime(2018, 11, 6, 9, 27, 3), 'op_type': u'delete', 'path': u'/aa', 'id': 268L, 'op_user': u'foo@foo.com', u'repo_name': u'tests\\'},

            {'username': self.user.username, 'commit_id': u'016435e95ace96902ea1bfa1e7688f45804d5aa4', 'obj_type': u'dir', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'95421aa563cf474dce02b7fadc532c17c11cd97a', 'timestamp': datetime.datetime(2018, 11, 6, 9, 38, 32), u'old_path': u'/11', 'op_type': u'move', 'path': u'/new/11', u'repo_name': u'tests\\', 'id': 283L, 'op_user': u'foo@foo.com', u'size': -1},

            {'username': self.user.username, 'commit_id': u'712504f1cfd94b0813763a106eb4140a5dba156a', 'obj_type': u'dir', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'4d83a9b62084fef33ec99787425f91df356ae307', 'timestamp': datetime.datetime(2018, 11, 6, 9, 39, 10), u'old_path': u'/new', 'op_type': u'rename', 'path': u'/new2', u'repo_name': u'tests\\', 'id': 284L, 'op_user': u'foo@foo.com', u'size': -1},

            {'username': self.user.username, 'commit_id': u'2f7021e0804187b8b09ec82142e0f8b53771cc69', 'obj_type': u'dir', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'0000000000000000000000000000000000000000', 'timestamp': datetime.datetime(2018, 11, 6, 9, 27, 6), 'op_type': u'recover', 'path': u'/aa', 'id': 269L, 'op_user': u'foo@foo.com', u'repo_name': u'tests\\'},
        ]

        return [Record(**x) for x in l]

    def _file_evs(self, ):
        l = [
            {'username': self.user.username, 'commit_id': u'658d8487b7e8916ee25703fbdf978b98ab76e3d4', 'obj_type': u'file', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'0000000000000000000000000000000000000000', 'timestamp': datetime.datetime(2018, 11, 6, 9, 38, 23), 'op_type': u'create', 'path': u'/11/new/aa/new/yy/xx/bb/1.txt', u'repo_name': u'tests\\', 'id': 282L, 'op_user': u'foo@foo.com', u'size': 0},

            {'username': self.user.username, 'commit_id': u'04df2a831ba485bb6f216f62c1b47883c3e3433c', 'obj_type': u'file', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'd16369af225687671348897a0ad918261866af5d', 'timestamp': datetime.datetime(2018, 11, 6, 9, 0, 14), 'op_type': u'delete', 'path': u'/aa1.txt', u'repo_name': u'tests\\', 'id': 257L, 'op_user': u'foo@foo.com', u'size': 2},

            {'username': self.user.username, 'commit_id': u'612f605faa112e4e8928dc08e91c669cea92ef59', 'obj_type': u'file', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'd16369af225687671348897a0ad918261866af5d', 'timestamp': datetime.datetime(2018, 11, 6, 9, 0, 22), 'op_type': u'recover', 'path': u'/aa1.txt', u'repo_name': u'tests\\', 'id': 258L, 'op_user': u'foo@foo.com', u'size': 2},

            {'username': self.user.username, 'commit_id': u'106e6e12138bf0e12fbd558da73ff24502807f3e', 'obj_type': u'file', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'28054f8015aada8b5232943d072526541f5227f9', 'timestamp': datetime.datetime(2018, 11, 6, 9, 0, 30), 'op_type': u'edit', 'path': u'/aa1.txt', u'repo_name': u'tests\\', 'id': 259L, 'op_user': u'foo@foo.com', u'size': 4},

            {'username': self.user.username, 'commit_id': u'1c9a12a2d8cca79f261eb7c65c118a3ea4f7b850', 'obj_type': u'file', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'28054f8015aada8b5232943d072526541f5227f9', 'timestamp': datetime.datetime(2018, 11, 6, 9, 36, 45), u'old_path': u'/11/new/aa/new/yy/xx/aa4.txt', 'op_type': u'move', 'path': u'/aa4.txt', u'repo_name': u'tests\\', 'id': 279L, 'op_user': u'foo@foo.com', u'size': 4},

            {'username': self.user.username, 'commit_id': u'19cab0f3c53ee00cffe6eaa65f256ccc35a77a72', 'obj_type': u'file', 'repo_id': u'7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', u'obj_id': u'28054f8015aada8b5232943d072526541f5227f9', 'timestamp': datetime.datetime(2018, 11, 6, 9, 36, 59), u'old_path': u'/aa4.txt', 'op_type': u'rename', 'path': u'/aa5.txt', u'repo_name': u'tests\\', 'id': 280L, 'op_user': u'foo@foo.com', u'size': 4},
        ]

        return [Record(**x) for x in l]

    @patch('seahub.notifications.management.commands.send_file_updates.seafevents_api')
    def test_dir_evs(self, mock_seafevents_api):
        mock_seafevents_api.get_user_activities_by_timestamp.return_value = self._dir_evs()

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 30)
        self.assertEqual(len(mail.outbox), 0)

        call_command('send_file_updates')
        mock_seafevents_api.get_user_activities_by_timestamp.assert_called_once()

        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username
        for op in ['Created', 'Deleted', 'Moved', 'Restored', 'Renamed', ]:
            assert op in mail.outbox[0].body

    @patch('seahub.notifications.management.commands.send_file_updates.seafevents_api')
    def test_file_evs(self, mock_seafevents_api):
        mock_seafevents_api.get_user_activities_by_timestamp.return_value = self._file_evs()

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 30)

        self.assertEqual(len(mail.outbox), 0)

        call_command('send_file_updates')
        mock_seafevents_api.get_user_activities_by_timestamp.assert_called_once()

        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username

        for op in ['Created', 'Deleted', 'Restored', 'Updated', 'Moved',
                   'Renamed', ]:
            assert op in mail.outbox[0].body

    @patch('seahub.notifications.management.commands.send_file_updates.seafevents_api')
    def test_repo_evs(self, mock_seafevents_api):
        mock_seafevents_api.get_user_activities_by_timestamp.return_value = self._repo_evs()

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 30)

        self.assertEqual(len(mail.outbox), 0)

        call_command('send_file_updates')
        mock_seafevents_api.get_user_activities_by_timestamp.assert_called_once()

        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username

        for op in ['Created', 'Deleted', 'Renamed', 'Removed']:
            assert op in mail.outbox[0].body

    @patch('seahub.notifications.management.commands.send_file_updates.seafevents_api')
    def test_seafevents_api(self, mock_seafevents_api):
        mock_seafevents_api.get_user_activities_by_timestamp.return_value = self._repo_evs()

        username = self.user.username
        UserOptions.objects.set_file_updates_email_interval(username, 30)
        assert UserOptions.objects.get_file_updates_last_emailed_time(username) is None

        today = datetime.datetime.utcnow().replace(hour=0).replace(
            minute=0).replace(second=0).replace(microsecond=0)

        before_dt = datetime.datetime.utcnow().replace(microsecond=0)
        call_command('send_file_updates')
        after_dt = datetime.datetime.utcnow().replace(microsecond=0)

        mock_seafevents_api.get_user_activities_by_timestamp.assert_called_once()
        args = mock_seafevents_api.get_user_activities_by_timestamp.call_args[0]
        assert args[0] == username
        assert args[1] == today

        last_emailed_dt = UserOptions.objects.get_file_updates_last_emailed_time(username)
        assert before_dt <= last_emailed_dt
        assert last_emailed_dt <= after_dt
        assert last_emailed_dt == args[2]

    @patch('seahub.notifications.management.commands.send_file_updates.seafevents_api')
    def test_email_interval(self, mock_seafevents_api):
        mock_seafevents_api.get_user_activities_by_timestamp.return_value = self._repo_evs()

        username = self.user.username
        assert UserOptions.objects.get_file_updates_last_emailed_time(username) is None

        # assume this command will be finished in 5 seconds
        UserOptions.objects.set_file_updates_email_interval(username, 5)
        assert mock_seafevents_api.get_user_activities_by_timestamp.called is False
        call_command('send_file_updates')
        assert mock_seafevents_api.get_user_activities_by_timestamp.called is True

        # still within 5 seconds ...
        mock_seafevents_api.get_user_activities_by_timestamp.reset_mock()
        assert mock_seafevents_api.get_user_activities_by_timestamp.called is False
        call_command('send_file_updates')
        assert mock_seafevents_api.get_user_activities_by_timestamp.called is False

        time.sleep(5)  # 5 seconds passed

        mock_seafevents_api.get_user_activities_by_timestamp.reset_mock()
        assert mock_seafevents_api.get_user_activities_by_timestamp.called is False
        call_command('send_file_updates')
        assert mock_seafevents_api.get_user_activities_by_timestamp.called is True

    @override_settings(TIME_ZONE='Asia/Shanghai')
    @patch('seahub.notifications.management.commands.send_file_updates.seafevents_api')
    def test_timezone_in_email_body(self, mock_seafevents_api):
        assert timezone.get_default_timezone_name() == 'Asia/Shanghai'
        mock_seafevents_api.get_user_activities_by_timestamp.return_value = self._repo_evs()

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 30)

        self.assertEqual(len(mail.outbox), 0)
        call_command('send_file_updates')
        self.assertEqual(len(mail.outbox), 1)
        assert '2018-11-05 14:46:02' in mail.outbox[0].body

    @patch('seahub.notifications.management.commands.send_file_updates.seafevents_api')
    def test_invalid_option_vals(self, mock_seafevents_api):
        mock_seafevents_api.get_user_activities_by_timestamp.return_value = self._repo_evs()

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 'a')

        try:
            call_command('send_file_updates')
            assert True
        except Exception:
            assert False
