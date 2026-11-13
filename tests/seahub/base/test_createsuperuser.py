import io
import os
import shutil
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase

from seahub.base.accounts import User
from seahub.base.management.commands.createsuperuser import Command

EMAIL = 'admin@example.com'
NOINPUT = ['--noinput', '--username=admin', '--email=%s' % EMAIL]
RESET_ADMIN = Path(__file__).resolve().parents[3] / 'scripts' / 'reset-admin.sh'


class CreateSuperuserTest(SimpleTestCase):

    def setUp(self):
        patcher = patch.object(User, 'objects')
        objects = patcher.start()
        self.addCleanup(patcher.stop)
        objects.get.side_effect = User.DoesNotExist
        self.create = objects.create_superuser

    def run_command(self, *args, stdin=''):
        with patch('sys.stdin', io.StringIO(stdin)):
            call_command(Command(), *args)

    def test_noinput_uses_supplied_password(self):
        self.run_command(*NOINPUT, '--password=secret')
        self.create.assert_called_once_with(EMAIL, 'secret')

    def test_noinput_without_password_passes_none(self):
        self.run_command(*NOINPUT)
        self.create.assert_called_once_with(EMAIL, None)

    def test_noinput_requires_valid_username_and_email(self):
        for args in (
            ['--noinput'],
            ['--noinput', '--username=admin'],
            ['--noinput', '--email=%s' % EMAIL],
            ['--noinput', '--username=admin', '--email=foo'],
        ):
            with self.subTest(args=args):
                with self.assertRaises(CommandError):
                    self.run_command(*args)
        self.create.assert_not_called()

    def test_rejects_unusable_password(self):
        for password in ('', ' ', ' foo', 'foo ', '\tfoo\n', '!'):
            for mode in (NOINPUT, ['--email=%s' % EMAIL]):
                with self.subTest(password=password, mode=mode):
                    with patch('getpass.getpass', side_effect=AssertionError('prompted')):
                        with self.assertRaises(CommandError):
                            self.run_command(*mode, '--password=%s' % password)
        self.create.assert_not_called()

    def test_reads_password_from_stdin(self):
        self.run_command(*NOINPUT, '--password=-', stdin='secret')
        self.create.assert_called_once_with(EMAIL, 'secret')

    def test_rejects_unusable_stdin_password(self):
        for stdin in ('', '\n', ' ', ' foo', 'foo ', '!', 'secret\n', 'secret\r\n'):
            with self.subTest(stdin=stdin):
                with self.assertRaises(CommandError):
                    self.run_command(*NOINPUT, '--password=-', stdin=stdin)
        self.create.assert_not_called()

    def test_supplied_password_skips_prompt(self):
        with patch('getpass.getpass', side_effect=AssertionError('prompted')):
            self.run_command('--email=%s' % EMAIL, '--password=secret')
        self.create.assert_called_once_with(EMAIL, 'secret')

    def test_prompts_for_omitted_password(self):
        with patch('getpass.getpass', side_effect=['secret', 'secret']) as getpass:
            self.run_command('--email=%s' % EMAIL)
        self.assertEqual(getpass.call_count, 2)
        self.create.assert_called_once_with(EMAIL, 'secret')

    def test_reprompts_after_mismatched_or_blank_password(self):
        with patch('getpass.getpass', side_effect=['foo', 'bar', '  ', '  ', 'secret', 'secret']):
            self.run_command('--email=%s' % EMAIL)
        self.create.assert_called_once_with(EMAIL, 'secret')

    def test_reprompts_after_unusable_password(self):
        with patch('getpass.getpass', side_effect=[' foo', ' foo', 'foo ', 'foo ', '!', '!', 'secret', 'secret']):
            self.run_command('--email=%s' % EMAIL)
        self.create.assert_called_once_with(EMAIL, 'secret')

    def test_reprompts_after_invalid_email(self):
        with patch('builtins.input', side_effect=['foo', EMAIL]), \
                patch('getpass.getpass', side_effect=['secret', 'secret']):
            self.run_command()
        self.create.assert_called_once_with(EMAIL, 'secret')


class ResetAdminScriptTest(SimpleTestCase):

    def test_forwards_arguments_and_stdin(self):
        with TemporaryDirectory() as tmp:
            topdir = Path(tmp)
            (topdir / 'seafile-data').mkdir()
            installdir = topdir / 'seafile-server-latest'
            installdir.mkdir()
            script = shutil.copy(RESET_ADMIN, installdir)

            fake_python = topdir / 'fake-python'
            fake_python.write_text(
                '#!/bin/bash\n'
                'printf "%%s\\n" "$@" > "%(top)s/args"\n'
                'cat > "%(top)s/stdin"\n' % {'top': topdir}
            )
            fake_python.chmod(0o755)

            subprocess.run(
                [script, '--username=foo bar', '--password=-'],
                input='secret\n',
                text=True,
                env={
                    'PATH': os.environ['PATH'],
                    'PYTHON': str(fake_python),
                    'JWT_PRIVATE_KEY': 'foo',
                },
                check=True,
                timeout=30,
            )

            args = (topdir / 'args').read_text().splitlines()
            self.assertEqual(args[1:], ['createsuperuser', '--username=foo bar', '--password=-'])
            self.assertEqual((topdir / 'stdin').read_text(), 'secret\n')
