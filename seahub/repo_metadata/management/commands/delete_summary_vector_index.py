from django.core.management.base import BaseCommand, CommandError

from seahub.repo_metadata.models import RepoMetadata
from seahub.repo_metadata.utils import delete_summary_vector_index


class Command(BaseCommand):
    help = 'Delete an AI summary vector index'

    def add_arguments(self, parser):
        parser.add_argument('repo_id')

    def handle(self, *args, **options):
        repo_id = options['repo_id']
        if not RepoMetadata.objects.filter(repo_id=repo_id).exists():
            raise CommandError('Library metadata not found: %s' % repo_id)

        delete_summary_vector_index({'repo_id': repo_id})
        RepoMetadata.objects.filter(repo_id=repo_id).update(
            ai_summary_indexed_at=None,
            ai_indexing_status='',
        )
        self.stdout.write('Deleted summary vector index: %s' % repo_id)
