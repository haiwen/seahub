# Copyright (c) 2012-2016 Seafile Ltd.
"""
Management utility to create superusers.
"""

import getpass
import os
import re
import sys
from django.core.management.base import BaseCommand, CommandError

from seahub.utils import is_valid_email
from seahub.base.accounts import User

RE_VALID_USERNAME = re.compile(r'[\w.@+-]+$')


class Command(BaseCommand):
    help = 'Used to create a superuser.'
    requires_migrations_checks = False

    def __init__(self, *args, **kwargs):
        super(Command, self).__init__(*args, **kwargs)

    def add_arguments(self, parser):
        parser.add_argument(
            '--noinput', '--no-input',
            action='store_false', dest='interactive', default=True,
            help=(
                'Tells Django to NOT prompt the user for input of any kind. '
                'You must use --%s with --noinput, along with an option for '
                'any other required field. Superusers created with --noinput will '
                'not be able to log in until they\'re given a valid password.' %
                'username'
            ),
        )

        for field in ['username', 'email', 'password']:
            parser.add_argument(
                '--%s' % field,
                # dest=field,
                default=None,
                help='Specifies the %s for the superuser.' % field,
            )

    def handle(self, *args, **options):
        username = options.get('username', None)
        email = options.get('email', None)
        password = options.get('password', None)
        interactive = options.get('interactive')

        # Do quick and dirty validation if --noinput
        if not interactive:
            if not username or not email:
                raise CommandError("You must use --username and --email with --noinput.")
            if not RE_VALID_USERNAME.match(username):
                raise CommandError("Invalid username. Use only letters, digits, and underscores")

            if not is_valid_email(email):
                raise CommandError("Invalid email address.")

        # Try to determine the current system user's username to use as a default.
        try:
            import pwd
            default_username = pwd.getpwuid(os.getuid())[0].replace(' ', '').lower()
        except (ImportError, KeyError):
            # KeyError will be raised by getpwuid() if there is no
            # corresponding entry in the /etc/passwd file (a very restricted
            # chroot environment, for example).
            default_username = ''

        # Determine whether the default username is taken, so we don't display
        # it as an option.
        if default_username:
            try:
                User.objects.get(email=default_username)
            except User.DoesNotExist:
                pass
            else:
                default_username = ''

        # Prompt for username/email/password. Enclose this whole thing in a
        # try/except to trap for a keyboard interrupt and exit gracefully.
        if interactive:
            try:

                # Get an email
                while True:
                    if not email:
                        email = input('E-mail address: ')

                    if not is_valid_email(email):
                        sys.stderr.write("Error: That e-mail address is invalid.\n")
                        email = None
                    else:
                        break

                # Get a password
                while True:
                    if not password:
                        password = getpass.getpass()
                        password2 = getpass.getpass('Password (again): ')
                        if password != password2:
                            sys.stderr.write("Error: Your passwords didn't match.\n")
                            password = None
                            continue
                    if password.strip() == '':
                        sys.stderr.write("Error: Blank passwords aren't allowed.\n")
                        password = None
                        continue
                    break
            except KeyboardInterrupt:
                sys.stderr.write("\nOperation cancelled.\n")
                sys.exit(1)

        User.objects.create_superuser(email, password)
        print("Superuser created successfully.")
