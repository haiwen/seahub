from django.core.management.base import BaseCommand

from seaserv import seafile_api
from seahub.tags.models import FileUUIDMap
from seahub.base.models import UserStarredFiles
from seahub.revision_tag.models import RevisionTags
from seahub.share.models import ExtraGroupsSharePermission, \
        ExtraSharePermission, UploadLinkShare


class Command(BaseCommand):
    help = "Clear invalid data when repo deleted"

    def handle(self, *args, **kwargs):
        self.stdout.write('Start to get all existing repo')
        self.all_repo = [repo.repo_id for repo in seafile_api.get_repo_list(-1, -1, ret_virt_repo=True)]
        trash_repo = [repo.repo_id for repo in seafile_api.get_trash_repo_list(-1, -1)]
        self.all_repo.extend(trash_repo)
        self.stdout.write('Successly get all existing repos')

        # on_delete is CASCADE, so FileTag/FileComment will be deleted
        self.tables = {'FileUUIDMap': FileUUIDMap, 'RevisionTags': RevisionTags,
                       'UserStarredFiles': UserStarredFiles,
                       'ExtraGroupsSharePermission': ExtraGroupsSharePermission,
                       'ExtraSharePermission': ExtraSharePermission,
                       'UploadLinkShare': UploadLinkShare}

        for table in list(self.tables.items()):
            self.clear_table(table[0], table[1])

        self.stdout.write('All invalid repo data are deleted')

    def clear_table(self, table_name, table_model):
        """ clear invalid data on table 
            table must has `repo_id` column and without foreign relationship 
        """
        self.stdout.write('Start to clear %s table' % table_name)
        tb_repo_ids = table_model.objects.all().values_list('repo_id', flat=True)
        table_model.objects.filter(repo_id__in=list(set(tb_repo_ids) - set(self.all_repo))).delete()
        self.stdout.write('%s table has been clear' % table_name)
