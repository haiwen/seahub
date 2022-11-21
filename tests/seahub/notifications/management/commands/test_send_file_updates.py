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
            {'username': self.user.username, 'commit_id': None, 'obj_type': 'repo', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'timestamp': datetime.datetime(2018, 11, 5, 6, 46, 2), 'op_type': 'create', 'path': '/', 'id': 254, 'op_user': 'foo@foo.com', 'repo_name': 'tests\\'},
            {'username': self.user.username, 'commit_id': None, 'obj_type': 'repo', 'repo_id': 'f8dc0bc8-eae0-4063-9beb-790071168794', 'timestamp': datetime.datetime(2018, 11, 6, 9, 52, 6), 'op_type': 'delete', 'path': '/', 'id': 289, 'op_user': 'foo@foo.com', 'repo_name': '123'},
            {'username': self.user.username, 'commit_id': '93fb5d8f07e03e5c947599cd7c948965426aafec', 'obj_type': 'repo', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'timestamp': datetime.datetime(2018, 11, 7, 2, 35, 34), 'old_repo_name': 'tests\\', 'op_type': 'rename', 'path': '/', 'id': 306, 'op_user': 'foo@foo.com', 'repo_name': 'tests\\123'},
            {'username': self.user.username, 'commit_id': None, 'obj_type': 'repo', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'timestamp': datetime.datetime(2018, 11, 7, 3, 13, 2), 'days': 0, 'op_type': 'clean-up-trash', 'path': '/', 'id': 308, 'op_user': 'foo@foo.com', 'repo_name': 'tests\\123'},
            {'username': self.user.username, 'commit_id': None, 'obj_type': 'repo', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'timestamp': datetime.datetime(2018, 11, 7, 3, 12, 43), 'days': 3, 'op_type': 'clean-up-trash', 'path': '/', 'id': 307, 'op_user': 'foo@foo.com', 'repo_name': 'tests\\123'},
        ]

        return [Record(**x) for x in l]

    def _dir_evs(self, ):
        l = [
            {'username': self.user.username, 'commit_id': '8ff6473e9ef5229a632e1481a1b28d52673220ec', 'obj_type': 'dir', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': '0000000000000000000000000000000000000000', 'timestamp': datetime.datetime(2018, 11, 6, 9, 10, 45), 'op_type': 'create', 'path': '/xx', 'id': 260, 'op_user': 'foo@foo.com', 'repo_name': 'tests\\'},

            {'username': self.user.username, 'commit_id': 'bb3ef321899d2f75ecf56098cb89e6b13c48cff9', 'obj_type': 'dir', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': '0000000000000000000000000000000000000000', 'timestamp': datetime.datetime(2018, 11, 6, 9, 27, 3), 'op_type': 'delete', 'path': '/aa', 'id': 268, 'op_user': 'foo@foo.com', 'repo_name': 'tests\\'},

            {'username': self.user.username, 'commit_id': '016435e95ace96902ea1bfa1e7688f45804d5aa4', 'obj_type': 'dir', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': '95421aa563cf474dce02b7fadc532c17c11cd97a', 'timestamp': datetime.datetime(2018, 11, 6, 9, 38, 32), 'old_path': '/11', 'op_type': 'move', 'path': '/new/11', 'repo_name': 'tests\\', 'id': 283, 'op_user': 'foo@foo.com', 'size': -1},

            {'username': self.user.username, 'commit_id': '712504f1cfd94b0813763a106eb4140a5dba156a', 'obj_type': 'dir', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': '4d83a9b62084fef33ec99787425f91df356ae307', 'timestamp': datetime.datetime(2018, 11, 6, 9, 39, 10), 'old_path': '/new', 'op_type': 'rename', 'path': '/new2', 'repo_name': 'tests\\', 'id': 284, 'op_user': 'foo@foo.com', 'size': -1},

            {'username': self.user.username, 'commit_id': '2f7021e0804187b8b09ec82142e0f8b53771cc69', 'obj_type': 'dir', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': '0000000000000000000000000000000000000000', 'timestamp': datetime.datetime(2018, 11, 6, 9, 27, 6), 'op_type': 'recover', 'path': '/aa', 'id': 269, 'op_user': 'foo@foo.com', 'repo_name': 'tests\\'},
        ]

        return [Record(**x) for x in l]

    def _file_evs(self, ):
        l = [
            {'username': self.user.username, 'commit_id': '658d8487b7e8916ee25703fbdf978b98ab76e3d4', 'obj_type': 'file', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': '0000000000000000000000000000000000000000', 'timestamp': datetime.datetime(2018, 11, 6, 9, 38, 23), 'op_type': 'create', 'path': '/11/new/aa/new/yy/xx/bb/1.txt', 'repo_name': 'tests\\', 'id': 282, 'op_user': 'foo@foo.com', 'size': 0},

            {'username': self.user.username, 'commit_id': '04df2a831ba485bb6f216f62c1b47883c3e3433c', 'obj_type': 'file', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': 'd16369af225687671348897a0ad918261866af5d', 'timestamp': datetime.datetime(2018, 11, 6, 9, 0, 14), 'op_type': 'delete', 'path': '/aa1.txt', 'repo_name': 'tests\\', 'id': 257, 'op_user': 'foo@foo.com', 'size': 2},

            {'username': self.user.username, 'commit_id': '612f605faa112e4e8928dc08e91c669cea92ef59', 'obj_type': 'file', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': 'd16369af225687671348897a0ad918261866af5d', 'timestamp': datetime.datetime(2018, 11, 6, 9, 0, 22), 'op_type': 'recover', 'path': '/aa1.txt', 'repo_name': 'tests\\', 'id': 258, 'op_user': 'foo@foo.com', 'size': 2},

            {'username': self.user.username, 'commit_id': '106e6e12138bf0e12fbd558da73ff24502807f3e', 'obj_type': 'file', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': '28054f8015aada8b5232943d072526541f5227f9', 'timestamp': datetime.datetime(2018, 11, 6, 9, 0, 30), 'op_type': 'edit', 'path': '/aa1.txt', 'repo_name': 'tests\\', 'id': 259, 'op_user': 'foo@foo.com', 'size': 4},

            {'username': self.user.username, 'commit_id': '1c9a12a2d8cca79f261eb7c65c118a3ea4f7b850', 'obj_type': 'file', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': '28054f8015aada8b5232943d072526541f5227f9', 'timestamp': datetime.datetime(2018, 11, 6, 9, 36, 45), 'old_path': '/11/new/aa/new/yy/xx/aa4.txt', 'op_type': 'move', 'path': '/aa4.txt', 'repo_name': 'tests\\', 'id': 279, 'op_user': 'foo@foo.com', 'size': 4},

            {'username': self.user.username, 'commit_id': '19cab0f3c53ee00cffe6eaa65f256ccc35a77a72', 'obj_type': 'file', 'repo_id': '7d6b3f36-3ce1-45f1-8c82-b9532e3162c7', 'obj_id': '28054f8015aada8b5232943d072526541f5227f9', 'timestamp': datetime.datetime(2018, 11, 6, 9, 36, 59), 'old_path': '/aa4.txt', 'op_type': 'rename', 'path': '/aa5.txt', 'repo_name': 'tests\\', 'id': 280, 'op_user': 'foo@foo.com', 'size': 4},
        ]

        return [Record(**x) for x in l]

    @patch('seahub.notifications.management.commands.send_file_updates.get_user_activities_by_timestamp')
    def test_dir_evs(self, mock_get_user_activities_by_timestamp):
        mock_get_user_activities_by_timestamp.return_value = self._dir_evs()

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 30)
        self.assertEqual(len(mail.outbox), 0)

        call_command('send_file_updates')
        mock_get_user_activities_by_timestamp.assert_called_once()

        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username
        for op in ['Created', 'Deleted', 'Moved', 'Restored', 'Renamed', ]:
            assert op in mail.outbox[0].body

    @patch('seahub.notifications.management.commands.send_file_updates.get_user_activities_by_timestamp')
    def test_file_evs(self, mock_get_user_activities_by_timestamp):
        mock_get_user_activities_by_timestamp.return_value = self._file_evs()

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 30)

        self.assertEqual(len(mail.outbox), 0)

        call_command('send_file_updates')
        mock_get_user_activities_by_timestamp.assert_called_once()

        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username

        for op in ['Created', 'Deleted', 'Restored', 'Updated', 'Moved',
                   'Renamed', ]:
            assert op in mail.outbox[0].body

    @patch('seahub.notifications.management.commands.send_file_updates.get_user_activities_by_timestamp')
    def test_repo_evs(self, mock_get_user_activities_by_timestamp):
        mock_get_user_activities_by_timestamp.return_value = self._repo_evs()

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 30)

        self.assertEqual(len(mail.outbox), 0)

        call_command('send_file_updates')
        mock_get_user_activities_by_timestamp.assert_called_once()

        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] == self.user.username

        for op in ['Created', 'Deleted', 'Renamed', 'Removed']:
            assert op in mail.outbox[0].body

    @patch('seahub.notifications.management.commands.send_file_updates.get_user_activities_by_timestamp')
    def test_seafevents_api(self, mock_get_user_activities_by_timestamp):
        mock_get_user_activities_by_timestamp.return_value = self._repo_evs()

        username = self.user.username
        UserOptions.objects.set_file_updates_email_interval(username, 30)
        assert UserOptions.objects.get_file_updates_last_emailed_time(username) is None

        today = datetime.datetime.utcnow().replace(hour=0).replace(
            minute=0).replace(second=0).replace(microsecond=0)

        before_dt = datetime.datetime.utcnow().replace(microsecond=0)
        call_command('send_file_updates')
        after_dt = datetime.datetime.utcnow().replace(microsecond=0)

        mock_get_user_activities_by_timestamp.assert_called_once()
        args = mock_get_user_activities_by_timestamp.call_args[0]
        assert args[0] == username
        assert args[1] == today

        last_emailed_dt = UserOptions.objects.get_file_updates_last_emailed_time(username)
        assert before_dt <= last_emailed_dt
        assert last_emailed_dt <= after_dt
        assert last_emailed_dt == args[2]

    @patch('seahub.notifications.management.commands.send_file_updates.get_user_activities_by_timestamp')
    def test_email_interval(self, mock_get_user_activities_by_timestamp):
        mock_get_user_activities_by_timestamp.return_value = self._repo_evs()

        username = self.user.username
        assert UserOptions.objects.get_file_updates_last_emailed_time(username) is None

        # assume this command will be finished in 5 seconds
        UserOptions.objects.set_file_updates_email_interval(username, 5)
        assert mock_get_user_activities_by_timestamp.called is False
        call_command('send_file_updates')
        assert mock_get_user_activities_by_timestamp.called is True

        # still within 5 seconds ...
        mock_get_user_activities_by_timestamp.reset_mock()
        assert mock_get_user_activities_by_timestamp.called is False
        call_command('send_file_updates')
        assert mock_get_user_activities_by_timestamp.called is False

        time.sleep(5)  # 5 seconds passed

        mock_get_user_activities_by_timestamp.reset_mock()
        assert mock_get_user_activities_by_timestamp.called is False
        call_command('send_file_updates')
        assert mock_get_user_activities_by_timestamp.called is True

    @override_settings(TIME_ZONE='Asia/Shanghai')
    @patch('seahub.notifications.management.commands.send_file_updates.get_user_activities_by_timestamp')
    def test_timezone_in_email_body(self, mock_get_user_activities_by_timestamp):
        assert timezone.get_default_timezone_name() == 'Asia/Shanghai'
        mock_get_user_activities_by_timestamp.return_value = self._repo_evs()

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 30)

        self.assertEqual(len(mail.outbox), 0)
        call_command('send_file_updates')
        self.assertEqual(len(mail.outbox), 1)
        assert '2018-11-05 14:46:02' in mail.outbox[0].body

    @patch('seahub.notifications.management.commands.send_file_updates.get_user_activities_by_timestamp')
    def test_invalid_option_vals(self, mock_get_user_activities_by_timestamp):
        mock_get_user_activities_by_timestamp.return_value = self._repo_evs()

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 'a')

        try:
            call_command('send_file_updates')
            assert True
        except Exception:
            assert False
