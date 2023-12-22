# -*- coding: utf-8 -*-
import logging
from datetime import datetime

from django.db import connection
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean database records.'
    label = "clean_db_records"

    clean_sql1 = "DELETE FROM sysadmin_extra_userloginlog WHERE to_days(now()) - to_days(login_date) > %d"
    clean_sql2 = "DELETE FROM Activity WHERE to_days(now()) - to_days(timestamp) > %d"
    clean_sql3 = "DELETE FROM FileAudit WHERE to_days(now()) - to_days(timestamp) > %d"
    clean_sql4 = "DELETE FROM FileUpdate WHERE to_days(now()) - to_days(timestamp) > %d"
    clean_sql5 = "DELETE FROM FileHistory WHERE to_days(now()) - to_days(timestamp) > %d"
    clean_sql6 = "DELETE FROM PermAudit WHERE to_days(now()) - to_days(timestamp) > %d"

    def add_arguments(self, parser):

        # Named (optional) arguments
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Days to keep the db records.',
        )

    def handle(self, *args, **options):
        days = int(options['days'])

        logger.debug('Start clean database records. days=%d' % days)
        self.stdout.write('[%s] Start clean database records. days=%d' % (datetime.now(), days))
        self.clean_records(days)
        self.stdout.write('[%s] Finish clean database records.\n' % datetime.now())
        logger.debug('Finish clean database records.\n')

    def clean_records(self,days):
        with connection.cursor() as cursor:
            try:
                cursor.execute(self.clean_sql1 % days)
                cursor.execute(self.clean_sql2 % days)
                cursor.execute(self.clean_sql3 % days)
                cursor.execute(self.clean_sql4 % days)
                cursor.execute(self.clean_sql5 % days)
                cursor.execute(self.clean_sql6 % days)
            except Exception as e:
                logger.error('Failed to clean database records, error: %s.' % e)
                self.stderr.write('[%s] Failed to clean database records, error: %s.' % (datetime.now(), e))
                return

        logger.debug('Successful clean database records.')
        self.stdout.write('[%s] Successful clean database records.' % datetime.now())
