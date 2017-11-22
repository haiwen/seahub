import json
from django.core.management.base import BaseCommand

from seaserv import seafile_api
from seahub.tags.models import FileUUIDMap
from seahub.base.models import UserStarredFiles
from seahub.revision_tag.models import RevisionTags
from seahub.wiki.models import PersonalWiki, GroupWiki
from seahub.notifications.models import UserNotification
from seahub.share.models import ExtraGroupsSharePermission, FileShare, \
        OrgFileShare, ExtraSharePermission, UploadLinkShare


class Command(BaseCommand):
    help = "Clear invalid data when repo deleted"

    def handle(self, *args, **kwargs):
        self.stdout.write('Started to get all exists repo')
        self.all_repo= [repo.repo_id for repo in seafile_api.get_repo_list(-1, -1)]
        trash_repo = [repo.repo_id for repo in seafile_api.get_trash_repo_list(-1, -1)]
        self.all_repo.extend(trash_repo)
        #on_delete is  CASCADE, so FileTag will be deleted
        self.stdout.write('Successly get all exists repo')

        self.cleawr_table('FileUUIDMap', FileUUIDMap)

        self.cleawr_table('RevisionTags', RevisionTags)

        self.clear_table('PersonalWiki', PersonalWiki)

        self.clear_table('GroupWiki', GroupWiki)

        self.clear_table('UserStarredFiles', UserStarredFiles)

        self.stdout.writeline('Start to clear UserNotification Table')
        all_repo_dumps = [json.dumps({'repo_id': repo}) for repo in self.all_repo]
        user_notification = UserNotification.objects.all()
        for detail in all_repo_dumps:
            user_notification.objects.exclude(detail__contains=detail)
        user_notification.delete()
        self.stdout.writeline('UserNotification table has been clear')

        self.clear_table('ExtraGroupsSharePermission', ExtraGroupsSharePermission)
        self.clear_table('ExtraSharePermission', ExtraSharePermission)

        self.stdout.writeline('Start to clear OrgFileShare/FileShare Table')
        fileshare_repo_ids = FileShare.objects.all().values_list('repo_id', flat=True)
        invalid_fileshare = FileShare.objects.filter(repo_id__in=list(set(fileshare_repo_ids) - set(self.all_repo)))
        OrgFileShare.objects.filter(file_share__in=invalid_fileshare).delete()
        invalid_fileshare.delete()
        self.stdout.writeline('OrgFileShare/FileShare Table has been clear')

        self.clear_table('UploadLinkShare', UploadLinkShare)

        self.stdout.write('All invalid repo data deleted')

    def clear_table(self, table_name, table_model):
        self.stdout.writeline('Started to clear %s table' % table_name)
        tb_repo_ids = table_model.objects.all().values_list('repo_id', flat=True)
        table_model.objects.filter(repo_id__in=list(set(tb_repo_ids) - set(self.all_repo))).delete()
        self.stdout.writeline('%s table has been clear' % table_name)
