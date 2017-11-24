from django.core.management.base import BaseCommand

from seaserv import seafile_api
from seahub.revision_tag.models import RevisionTags
from seahub.tags.models import FileUUIDMap


class Command(BaseCommand):
    help = "Clear invalid data when repo deleted"

    def handle(self, *args, **kwargs):
        all_repo= [repo.repo_id for repo in seafile_api.get_repo_list(-1, -1)]
        trash_repo = [repo.repo_id for repo in seafile_api.get_trash_repo_list(-1, -1)]
        all_repo.extend(trash_repo)
        #on_delete is  CASCADE, so FileTag will be deleted
        fup_repo_ids = FileUUIDMap.objects.all().values_list('repo_id', flat=True)
        FileUUIDMap.objects.filter(repo_id__in=list(set(fup_repo_ids) - set(all_repo))).delete()
        rt_repo_ids = RevisionTags.objects.all().values_list('repo_id', flat=True)
        RevisionTags.objects.filter(repo_id__in=list(set(rt_repo_ids) - set(all_repo))).delete()


        self.stdout.write('Invalid repo data deleted')
