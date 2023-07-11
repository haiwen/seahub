import time

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
        start_time1 = time.time()
        self.all_repo = [repo.repo_id for repo in seafile_api.get_repo_list(-1, -1, ret_virt_repo=True)]
        end_time1 = time.time()
        self.stdout.write('It takes %s seconds to get repo list' % (end_time1 - start_time1))
        self.stdout.write('all_repo count %s' % len(self.all_repo))

        start_time2 = time.time()
        trash_repo = [repo.repo_id for repo in seafile_api.get_trash_repo_list(-1, -1)]
        end_time2 = time.time()
        self.stdout.write('It takes %s seconds to get trash repo list' % (end_time2 - start_time2))
        self.stdout.write('trash_repo count %s' % len(trash_repo))

        self.all_repo.extend(trash_repo)
        self.stdout.write('total repos count %s' % len(self.all_repo))
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
        start_time3 = time.time()
        tb_repo_ids = table_model.objects.all().values_list('repo_id', flat=True)
        end_time3 = time.time()
        self.stdout.write('It takes %s seconds to get table %s repo_ids' % ((end_time3 - start_time3), table_name))
        self.stdout.write('Table %s records count %s, repo_id count %s' % (table_name, len(tb_repo_ids), len(set(tb_repo_ids))))
        self.stdout.write('Table %s will clear these invalid repo data:\n%s' %
                          (table_name, '\n'.join(list(set(tb_repo_ids) - set(self.all_repo)))))

        deleted_count = table_model.objects.filter(repo_id__in=list(set(tb_repo_ids) - set(self.all_repo))).count()
        self.stdout.write('Deleted records count %s' % deleted_count)
        # table_model.objects.filter(repo_id__in=list(set(tb_repo_ids) - set(self.all_repo))).delete()
        self.stdout.write('%s table has been clear\n\n' % table_name)
