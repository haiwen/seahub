# Copyright (c) 2012-2016 Seafile Ltd.
"""
Management utility to create superusers.
"""

import getpass
import os
import re
import sys
from optparse import make_option
from django.core import exceptions
from django.core.management.base import BaseCommand, CommandError
from django.utils.translation import ugettext as _

from seahub.base.accounts import User

RE_VALID_USERNAME = re.compile('[\w.@+-]+$')

EMAIL_RE = re.compile(
    r"(^[-!#$%&'*+/=?^_`{}|~0-9A-Z]+(\.[-!#$%&'*+/=?^_`{}|~0-9A-Z]+)*"  # dot-atom
    r'|^"([\001-\010\013\014\016-\037!#-\[\]-\177]|\\[\001-\011\013\014\016-\177])*"' # quoted-string
    r')@(?:[A-Z0-9-]+\.)+[A-Z]{2,6}$', re.IGNORECASE)  # domain

def is_valid_email(value):
    if not EMAIL_RE.search(value):
        raise exceptions.ValidationError(_('Enter a valid e-mail address.'))

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
        interactive = options.get('interactive')
        
        # Do quick and dirty validation if --noinput
        if not interactive:
            if not username or not email:
                raise CommandError("You must use --username and --email with --noinput.")
            if not RE_VALID_USERNAME.match(username):
                raise CommandError("Invalid username. Use only letters, digits, and underscores")
            try:
                is_valid_email(email)
            except exceptions.ValidationError:
                raise CommandError("Invalid email address.")

        password = ''

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
            
                # Get a username
                # while 1:
                #     if not username:
                #         input_msg = 'Username'
                #         if default_username:
                #             input_msg += ' (Leave blank to use %r)' % default_username
                #         username = raw_input(input_msg + ': ')
                #     if default_username and username == '':
                #         username = default_username
                #     if not RE_VALID_USERNAME.match(username):
                #         sys.stderr.write("Error: That username is invalid. Use only letters, digits and underscores.\n")
                #         username = None
                #         continue
                #     try:
                #         User.objects.get(email=username)
                #     except User.DoesNotExist:
                #         break
                #     else:
                #         sys.stderr.write("Error: That username is already taken.\n")
                #         username = None
            
                # Get an email
                while True:
                    if not email:
                        email = input('E-mail address: ')
                    try:
                        is_valid_email(email)
                    except exceptions.ValidationError:
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
