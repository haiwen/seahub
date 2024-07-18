import logging
from datetime import datetime
from seahub.utils import SeafEventsSession
from seafevents import seafevents_api
from seaserv import seafile_api
from django.core.management.base import BaseCommand


logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clear the designated repo trash within the specified time'
    label = 'clean_repo_trash'

    def print_msg(self, msg):
        self.stdout.write('[%s] %s\n' % (datetime.now(), msg))

    def add_arguments(self, parser):
        parser.add_argument('--keep-days', help='keep days', type=int)

    def handle(self, *args, **options):
        days = options.get('keep_days')
        if days < 0:
            self.print_msg('keep-days cannot be set to nagative number')
            return
        logger.info('Start clean repo trash...')
        self.print_msg('Start clean repo trash...')
        self.do_action(days)
        self.print_msg('Finish clean repo trash.\n')
        logger.info('Finish clean repo trash.\n')

    def do_action(self, days):
        try:
            session = SeafEventsSession()
            seafevents_api.clean_up_all_repo_trash(session, days)
        except Exception as e:
            logger.debug('Clean up repo trash error: %s' % e)
            self.print_msg('Clean up repo trash error: %s' % e)
            return

        logger.info('Successfully cleared repo trash older than %s days' % days)
        self.print_msg('Successfully cleared repo trash older than %s days' % days)
