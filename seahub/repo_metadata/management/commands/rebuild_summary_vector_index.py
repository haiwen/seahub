from django.core.management.base import BaseCommand, CommandError

from seahub.repo_metadata.models import RepoMetadata
from seahub.repo_metadata.utils import rebuild_summary_vector_index


class Command(BaseCommand):
    help = 'Rebuild AI summary vector indexes'

    def add_arguments(self, parser):
        parser.add_argument('repo_id', nargs='?')
        parser.add_argument('--all', action='store_true', dest='rebuild_all')

    def handle(self, *args, **options):
        repo_id = options.get('repo_id')
        rebuild_all = options.get('rebuild_all')
        if bool(repo_id) == bool(rebuild_all):
            raise CommandError('Specify one repo_id or --all')

        records = RepoMetadata.objects.filter(enabled=True, summary_enabled=True)
        if repo_id:
            records = records.filter(repo_id=repo_id)
        records = list(records.only('repo_id'))
        if repo_id and not records:
            raise CommandError('Eligible library not found: %s' % repo_id)

        for record in records:
            RepoMetadata.objects.filter(repo_id=record.repo_id).update(
                ai_summary_indexed_at=None,
                ai_indexing_status='pending',
            )
            rebuild_summary_vector_index({'repo_id': record.repo_id})
            self.stdout.write('Enqueued summary vector rebuild: %s' % record.repo_id)
