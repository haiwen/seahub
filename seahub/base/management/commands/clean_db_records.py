# -*- coding: utf-8 -*-
import logging
from datetime import datetime

from django.db import connection
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean database records.'
    label = "clean_db_records"

    clean_sql1 = "DELETE FROM sysadmin_extra_userloginlog WHERE to_days(now()) - to_days(login_date) > "
    clean_sql2 = "DELETE FROM Activity WHERE to_days(now()) - to_days(timestamp) > "
    clean_sql3 = "DELETE FROM FileAudit WHERE to_days(now()) - to_days(timestamp) > "
    clean_sql4 = "DELETE FROM FileUpdate WHERE to_days(now()) - to_days(timestamp) > "
    clean_sql5 = "DELETE FROM FileHistory WHERE to_days(now()) - to_days(timestamp) > "
    clean_sql6 = "DELETE FROM PermAudit WHERE to_days(now()) - to_days(timestamp) > "
    clean_sql7 = "DELETE FROM FileTrash WHERE to_days(now()) - to_days(delete_time) > "
    clean_sql8 = "DELETE FROM UserActivity WHERE to_days(now()) - to_days(timestamp) > "

    def add_arguments(self, parser):
        parser.add_argument(
            '--ndays',
            default=90,
            type=int,
            help=(
                'Clean database records older than N days. Int, Default: 90'
            ),
        )

    def handle(self, *args, **options):
        ndays = options.get('ndays', 90)
        if ndays <= 0: ndays = 90
        if ndays >= 3650: ndays = 90
        logger.debug('Start clean database records.')
        self.stdout.write('[%s] Start clean database records (%d days).' % (datetime.now(), ndays))
        self.clean_records(str(ndays))
        self.stdout.write('[%s] Finish clean database records.\n' % datetime.now())
        logger.debug('Finish clean database records.\n')

    def clean_records(self, ndays):
        with connection.cursor() as cursor:
            try:
                cursor.execute(self.clean_sql1 + ndays)
                cursor.execute(self.clean_sql2 + ndays)
                cursor.execute(self.clean_sql3 + ndays)
                cursor.execute(self.clean_sql4 + ndays)
                cursor.execute(self.clean_sql5 + ndays)
                cursor.execute(self.clean_sql6 + ndays)
                cursor.execute(self.clean_sql7 + ndays)
                cursor.execute(self.clean_sql8 + ndays)
            except Exception as e:
                logger.error('Failed to clean database records, error: %s.' % e)
                self.stderr.write('[%s] Failed to clean database records, error: %s.' % (datetime.now(), e))
                return

        logger.debug('Successful clean database records.')
        self.stdout.write('[%s] Successful clean database records.' % datetime.now())
