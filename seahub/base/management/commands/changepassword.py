# Copyright (c) 2012-2016 Seafile Ltd.
import getpass
import warnings

from django.core.management.base import BaseCommand, CommandError
from pysearpc import SearpcError
from seaserv import ccnet_api

from seahub.base.accounts import User
from seahub.base.management.commands.createsuperuser import (
    INVALID_PASSWORD_MESSAGE,
    is_valid_password,
)
from seahub.profile.models import Profile
from seahub.utils import clear_token


class Command(BaseCommand):
    help = "Change a user's password for seahub."

    def add_arguments(self, parser):
        parser.add_argument('email', nargs='?', help='Account email address.')
        parser.add_argument(
            '--system-admin', action='store_true',
            help='Reset an existing local system administrator password. Prompts for the email if omitted.',
        )

    def handle(self, *args, **options):
        system_admin = options['system_admin']
        email = options['email']
        try:
            if system_admin:
                email = (email or '').strip().lower()
                while not email:
                    email = input('E-mail address: ').strip().lower()
                # New accounts store their email separately from the internal ID.
                username = Profile.objects.get_username_by_contact_email(email) or email
            else:
                if not email:
                    raise CommandError('An email argument is required unless --system-admin is used.')
                username = email

            try:
                user = User.objects.get(email=username)
            except User.DoesNotExist:
                raise CommandError("No account found for '%s'." % email) from None

            if system_admin:
                if not user.is_staff:
                    raise CommandError("'%s' is not a system administrator." % email)
                if user.source != 'DB':
                    raise CommandError('Only local database passwords can be reset by this command.')
            else:
                self.stdout.write("Changing password for user '%s'" % user.username)

            password = self._prompt_password(email, system_admin)
        except (EOFError, KeyboardInterrupt):
            raise CommandError('Operation cancelled.') from None

        if system_admin:
            self._reset_system_admin_password(user, password)
            return "Password reset successfully for '%s'." % email

        user.set_password(password)
        user.save()
        return "Password changed successfully for user '%s'" % user.username

    def _prompt_password(self, email, system_admin):
        try:
            with warnings.catch_warnings():
                # Do not let getpass fall back to echoing the password.
                warnings.simplefilter('error', getpass.GetPassWarning)
                attempts = 0
                while system_admin or attempts < 3:
                    password = getpass.getpass('Password: ')
                    if not system_admin and not password:
                        raise CommandError('aborted')
                    confirmation = getpass.getpass('Password (again): ')
                    if not system_admin and not confirmation:
                        raise CommandError('aborted')
                    if password != confirmation:
                        self.stderr.write('Passwords do not match. Please try again.')
                        attempts += 1
                    elif system_admin and not is_valid_password(password):
                        self.stderr.write('Error: %s' % INVALID_PASSWORD_MESSAGE)
                    else:
                        return password
        except getpass.GetPassWarning:
            raise CommandError('A terminal with hidden password input is required.') from None
        raise CommandError("Aborting password change for user '%s' after %s attempts" % (email, attempts))

    def _reset_system_admin_password(self, user, password):
        # Use the update-only RPC: User.save() can fall back to creating a user.
        try:
            result = ccnet_api.update_emailuser('DB', user.id, password, int(user.is_staff), int(user.is_active))
        except SearpcError:
            raise CommandError('Failed to save the new password.') from None
        if result != 0:
            raise CommandError('Failed to save the new password.')

        try:
            clear_token(user.username)
        except Exception:
            self.stderr.write('Warning: The password was changed, but existing tokens could not all be cleared.')
