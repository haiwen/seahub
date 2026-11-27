import getpass
import io
import os
import shutil
import subprocess
import warnings
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase
from pysearpc import SearpcError

from seahub.base.accounts import User
from seahub.base.management.commands import changepassword


EMAIL = 'admin@example.com'
USERNAME = 'internal-id@auth.local'
SCRIPT = Path(__file__).resolve().parents[3] / 'scripts' / 'reset-admin-password.sh'


class ChangePasswordTest(SimpleTestCase):
    def setUp(self):
        self.user = SimpleNamespace(id=12, username=USERNAME, is_staff=True, is_active=True, source='DB')
        self.stdout = io.StringIO()
        self.stderr = io.StringIO()
        self.lookup_email = self.mock('Profile.objects').get_username_by_contact_email
        self.lookup_email.return_value = USERNAME
        self.lookup_user = self.mock('User.objects').get
        self.lookup_user.return_value = self.user
        self.update = self.mock('ccnet_api.update_emailuser')
        self.update.return_value = 0
        self.clear_token = self.mock('clear_token')

    def mock(self, name):
        patcher = patch(f'{changepassword.__name__}.{name}')
        mocked = patcher.start()
        self.addCleanup(patcher.stop)
        return mocked

    def run_command(self, *args, passwords=('new-secret', 'new-secret'), email=EMAIL):
        with patch('builtins.input', return_value=email), \
                patch('getpass.getpass', side_effect=passwords):
            call_command(changepassword.Command(), *args, stdout=self.stdout, stderr=self.stderr)

    def run_admin_command(self, *args, **kwargs):
        self.run_command('--system-admin', *args, **kwargs)

    def test_default_mode_uses_existing_user_password_flow(self):
        self.user = Mock(username=USERNAME, is_staff=False)
        self.lookup_user.return_value = self.user
        self.run_command(USERNAME)
        self.lookup_user.assert_called_once_with(email=USERNAME)
        self.lookup_email.assert_not_called()
        self.user.set_password.assert_called_once_with('new-secret')
        self.user.save.assert_called_once_with()
        self.update.assert_not_called()

    def test_default_mode_requires_email(self):
        with self.assertRaisesMessage(CommandError, 'An email argument is required'):
            self.run_command(passwords=())
        self.lookup_user.assert_not_called()

    def test_updates_existing_admin_by_contact_email(self):
        self.run_admin_command(email=' Admin@Example.COM ')
        self.lookup_email.assert_called_once_with(EMAIL)
        self.lookup_user.assert_called_once_with(email=USERNAME)
        self.update.assert_called_once_with('DB', 12, 'new-secret', 1, 1)
        self.clear_token.assert_called_once_with(USERNAME)
        self.assertIn('Password reset successfully', self.stdout.getvalue())

    def test_legacy_email_and_inactive_status_are_preserved(self):
        self.lookup_email.return_value = None
        self.user.username = EMAIL
        self.user.is_active = False
        self.run_admin_command(EMAIL, email='')
        self.lookup_user.assert_called_once_with(email=EMAIL)
        self.update.assert_called_once_with('DB', 12, 'new-secret', 1, 0)

    def test_rejects_missing_account(self):
        self.lookup_user.side_effect = User.DoesNotExist
        with self.assertRaisesMessage(CommandError, 'No account found'):
            self.run_admin_command(passwords=())
        self.update.assert_not_called()

    def test_rejects_non_admin(self):
        self.user.is_staff = False
        with self.assertRaisesMessage(CommandError, 'not a system administrator'):
            self.run_admin_command(passwords=())
        self.update.assert_not_called()

    def test_rejects_ldap_admin(self):
        self.user.source = 'LDAPImport'
        with self.assertRaisesMessage(CommandError, 'Only local database passwords'):
            self.run_admin_command(passwords=())
        self.update.assert_not_called()

    def test_reprompts_on_mismatch_and_invalid_password(self):
        self.run_admin_command(passwords=('one', 'two', '', '', '!', '!', ' bad', ' bad', 'ok', 'ok'))
        self.update.assert_called_once_with('DB', 12, 'ok', 1, 1)
        self.assertIn('Passwords do not match', self.stderr.getvalue())
        self.assertIn('Password must not be empty', self.stderr.getvalue())

    def test_cancellation_does_not_update_password(self):
        for interruption in (KeyboardInterrupt, EOFError):
            with self.subTest(interruption=interruption):
                with self.assertRaisesMessage(CommandError, 'Operation cancelled'):
                    self.run_admin_command(passwords=interruption)
        self.update.assert_not_called()

    def test_refuses_to_echo_password(self):
        def warn_getpass(_prompt):
            warnings.warn('Cannot disable echo', getpass.GetPassWarning)
            self.fail('Continued without hidden input')

        with self.assertRaisesMessage(CommandError, 'hidden password input is required'):
            self.run_admin_command(passwords=warn_getpass)
        self.update.assert_not_called()

    def test_save_failure_is_not_reported_as_success(self):
        for error in (None, SearpcError('RPC failed')):
            with self.subTest(error=error):
                self.update.return_value = -1
                self.update.side_effect = error
                with self.assertRaisesMessage(CommandError, 'Failed to save the new password'):
                    self.run_admin_command()
        self.clear_token.assert_not_called()
        self.assertEqual(self.stdout.getvalue(), '')


class ResetAdminPasswordScriptTest(SimpleTestCase):
    def test_invokes_command_in_deployment_environment(self):
        with TemporaryDirectory() as tmp:
            topdir = Path(tmp).resolve()
            installdir = topdir / 'seafile-server-latest'
            installdir.mkdir()
            (topdir / 'seafile-data').mkdir()
            (topdir / 'conf').mkdir()
            (topdir / 'conf' / '.env').write_text('JWT_PRIVATE_KEY=test-only\n')
            script = shutil.copy(SCRIPT, installdir)

            fake_python = topdir / 'fake-python'
            fake_python.write_text(
                '#!/bin/bash\n'
                'printf "%s\\n" "$@" "$SEAFILE_CENTRAL_CONF_DIR" "$SEAFILE_RPC_PIPE_PATH" "$JWT_PRIVATE_KEY"\n'
                'exit 7\n'
            )
            fake_python.chmod(0o755)

            result = subprocess.run(
                [script, '--help'],
                capture_output=True,
                text=True,
                env={'PATH': os.environ['PATH'], 'PYTHON': str(fake_python)},
                timeout=30,
            )
            self.assertEqual(result.returncode, 7, result.stderr)
            self.assertEqual(result.stdout.splitlines(), [
                str(installdir / 'seahub' / 'manage.py'),
                'changepassword', '--system-admin', '--help',
                str(topdir / 'conf'), str(installdir / 'runtime'), 'test-only',
            ])
