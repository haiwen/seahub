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
        parser.add_argument('--repo-id', help='repo id', type=str)
        parser.add_argument('--keep-days', help='keep days', type=int)

    def handle(self, *args, **options):
        repo_id = options.get('repo_id')
        if not repo_id:
            self.stdout.write(
                '\nPlease use < --repo_id | --keep_days'
            )
            return
            
        days = options.get('keep_days', 0)
        logger.info('Start clean repo trash...')
        self.print_msg('Start clean repo trash...')
        self.do_action(repo_id, days)
        self.print_msg('Finish clean repo trash.\n')
        logger.info('Finish clean repo trash.\n')

    def do_action(self, repo_id, days):
        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            self.print_msg('Clean repo trash %s, error: %s' % (repo_id, e))
            return
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            self.print_msg(error_msg)
            return
        try:
            session = SeafEventsSession()
            seafevents_api.clean_up_repo_trash(session, repo_id, days)
        except Exception as e:
            logger.debug('Clean repo trash %s[%s], error: %s' % (repo.name, repo_id, e))
            self.print_msg('Clean repo trash %s[%s], error: %s' % (repo.name, repo_id, e))
            return

        logger.info('Successfully cleared repo trash %s older than %s days' % (repo.name, days))
        self.print_msg('Successfully cleared repo trash %s older than %s days' % (repo.name, days))
