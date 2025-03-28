# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
from django.db import models
from django.db.models import Q
from django.utils import timezone

from pysearpc import SearpcError
from seaserv import seafile_api

from seahub.auth.signals import user_logged_in
from seahub.organizations.signals import org_last_activity
from seahub.signals import group_member_audit
from seahub.utils import within_time_range, gen_token, \
        normalize_file_path, normalize_dir_path
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.tags.models import FileUUIDMap
from .fields import LowerCaseCharField


# Get an instance of a logger
logger = logging.getLogger(__name__)


class TimestampedModel(models.Model):
    # A timestamp representing when this object was created.
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # A timestamp reprensenting when this object was last updated.
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        abstract = True

        # By default, any model that inherits from `TimestampedModel` should
        # be ordered in reverse-chronological order. We can override this on a
        # per-model basis as needed, but reverse-chronological is a good
        # default ordering for most models.
        ordering = ['-created_at', '-updated_at']


class FileCommentManager(models.Manager):
    def add(self, repo_id, parent_path, item_name, author, comment, detail=''):
        fileuuidmap = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id,
                                                                    parent_path,
                                                                    item_name,
                                                                    False)
        c = self.model(uuid=fileuuidmap, author=author, comment=comment, detail=detail)
        c.save(using=self._db)
        return c

    def add_by_file_path(self, repo_id, file_path, author, comment, detail=''):
        file_path = self.model.normalize_path(file_path)
        parent_path = os.path.dirname(file_path)
        item_name = os.path.basename(file_path)

        return self.add(repo_id, parent_path, item_name, author, comment, detail)

    def get_by_file_path(self, repo_id, file_path):
        parent_path = os.path.dirname(file_path)
        item_name = os.path.basename(file_path)
        uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(repo_id, parent_path,
                                                           item_name, False)

        objs = super(FileCommentManager, self).filter(
            uuid=uuid)

        return objs

    def list_by_file_uuid(self, file_uuid):
        objs = self.filter(uuid=file_uuid)
        return objs

    def add_by_file_uuid(self, file_uuid, author, comment, detail=''):
        fileuuidmap = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        return self.create(
            uuid=fileuuidmap, author=author, comment=comment, detail=detail)

    def get_by_parent_path(self, repo_id, parent_path):
        uuids = FileUUIDMap.objects.get_fileuuidmaps_by_parent_path(repo_id,
                                                                    parent_path)
        objs = super(FileCommentManager, self).filter(uuid__in=uuids)
        return objs


class FileComment(models.Model):
    """
    Model used to record file comments.
    """
    uuid = models.ForeignKey(FileUUIDMap, on_delete=models.CASCADE)
    author = LowerCaseCharField(max_length=255, db_index=True)
    comment = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)
    resolved = models.BooleanField(default=False, db_index=True)
    detail = models.TextField(default='')

    objects = FileCommentManager()

    @classmethod
    def normalize_path(self, path):
        return path.rstrip('/') if path != '/' else '/'

    def to_dict(self, reply_queryset=None):
        from seahub.api2.utils import user_to_dict
        o = self
        replies = []
        if reply_queryset:
            r = reply_queryset.filter(comment_id=o.pk)
            for reply in r:
                data = reply.to_dict()
                data.update(user_to_dict(reply.author))
                replies.append(data)
        return {
            'id': o.pk,
            'repo_id': o.uuid.repo_id,
            'parent_path': o.uuid.parent_path,
            'item_name': o.uuid.filename,
            'comment': o.comment,
            'created_at': datetime_to_isoformat_timestr(o.created_at),
            'updated_at': datetime_to_isoformat_timestr(o.updated_at),
            'resolved': o.resolved,
            'detail': o.detail,
            'replies': replies,
        }


# starred files
class StarredFile(object):
    def format_path(self):
        if self.path == "/":
            return self.path

        # strip leading slash
        path = self.path[1:]
        if path[-1:] == '/':
            path = path[:-1]
        return path.replace('/', ' / ')

    def __init__(self, org_id, repo, file_id, path, is_dir, size):
        # always 0 for non-org repo
        self.org_id = org_id
        self.repo = repo
        self.file_id = file_id
        self.path = path
        self.formatted_path = self.format_path()
        self.is_dir = is_dir
        self.size = size
        self.last_modified = None
        if not is_dir:
            self.name = path.split('/')[-1]


class UserStarredFilesManager(models.Manager):

    def get_starred_repos_by_user(self, email):

        starred_repos = UserStarredFiles.objects.filter(email=email, path='/')
        return starred_repos

    def get_starred_item(self, email, repo_id, path):

        path_list = [normalize_file_path(path), normalize_dir_path(path)]
        starred_items = UserStarredFiles.objects.filter(email=email, repo_id=repo_id) \
                                                .filter(Q(path__in=path_list))

        return starred_items[0] if len(starred_items) > 0 else None

    def add_starred_item(self, email, repo_id, path, is_dir, org_id=-1):

        starred_item = UserStarredFiles.objects.create(email=email,
                                                       repo_id=repo_id,
                                                       path=path,
                                                       is_dir=is_dir,
                                                       org_id=org_id)

        return starred_item

    def delete_starred_item(self, email, repo_id, path):

        path_list = [normalize_file_path(path), normalize_dir_path(path)]
        starred_items = UserStarredFiles.objects.filter(email=email, repo_id=repo_id) \
                                                .filter(Q(path__in=path_list))

        for item in starred_items:
            item.delete()

    def get_starred_files_by_username(self, username):
        """Get a user's starred files.

        Arguments:
        - `self`:
        - `username`:
        """
        starred_files = super(UserStarredFilesManager, self).filter(
            email=username, is_dir=False, org_id=-1)

        ret = []
        repo_cache = {}
        for sfile in starred_files:
            # repo still exists?
            if sfile.repo_id in repo_cache:
                repo = repo_cache[sfile.repo_id]
            else:
                try:
                    repo = seafile_api.get_repo(sfile.repo_id)
                except SearpcError:
                    continue
                if repo is not None:
                    repo_cache[sfile.repo_id] = repo
                else:
                    sfile.delete()
                    continue

            # file still exists?
            file_id = ''
            # size = -1
            if sfile.path != "/":
                try:
                    file_id = seafile_api.get_file_id_by_path(sfile.repo_id,
                                                              sfile.path)
                    # size = seafile_api.get_file_size(file_id)
                except SearpcError:
                    continue
                if not file_id:
                    sfile.delete()
                    continue

            # TODO: remove ``size`` from StarredFile
            f = StarredFile(sfile.org_id, repo, file_id, sfile.path,
                            sfile.is_dir, 0)
            ret.append(f)

        '''Calculate files last modification time'''
        for sfile in ret:
            if sfile.is_dir:
                continue

            try:
                # get real path for sub repo
                real_path = sfile.repo.origin_path + sfile.path if sfile.repo.origin_path else sfile.path
                dirent = seafile_api.get_dirent_by_path(sfile.repo.store_id,
                                                        real_path)
                if dirent:
                    sfile.last_modified = dirent.mtime
                else:
                    sfile.last_modified = 0
            except SearpcError as e:
                logger.error(e)
                sfile.last_modified = 0

        ret.sort(key=lambda x: x.last_modified, reverse=True)

        return ret


class UserStarredFiles(models.Model):
    """Starred files are marked by users to get quick access to it on user
    home page.

    """
    email = models.EmailField(db_index=True)
    org_id = models.IntegerField()
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    is_dir = models.BooleanField()

    objects = UserStarredFilesManager()


# misc
class UserLastLoginManager(models.Manager):
    def get_by_username(self, username):
        """Return last login record for a user, delete duplicates if there are
        duplicated records.
        """
        try:
            return self.get(username=username)
        except UserLastLogin.DoesNotExist:
            return None
        except UserLastLogin.MultipleObjectsReturned:
            dups = self.filter(username=username)
            ret = dups[0]
            for dup in dups[1:]:
                dup.delete()
                logger.warn('Delete duplicate user last login record: %s' % username)
            return ret


class UserLastLogin(models.Model):
    username = models.CharField(max_length=255, db_index=True)
    last_login = models.DateTimeField(default=timezone.now)
    objects = UserLastLoginManager()


def update_last_login(sender, user, **kwargs):
    """
    A signal receiver which updates the last_login date for
    the user logging in.
    """
    user_last_login = UserLastLogin.objects.get_by_username(user.username)
    if user_last_login is None:
        user_last_login = UserLastLogin(username=user.username)
    user_last_login.last_login = timezone.now()
    user_last_login.save()


user_logged_in.connect(update_last_login)

class OrgLastActivityTime(models.Model):
    org_id = models.IntegerField(unique=True, db_index=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'org_last_active_time'

def update_org_last_activity_time(sender, org_id, **kwargs):
    OrgLastActivityTime.objects.update_or_create(org_id=org_id, defaults={'timestamp': timezone.now})

org_last_activity.connect(update_org_last_activity_time)

class CommandsLastCheck(models.Model):
    """Record last check time for Django/custom commands.
    """
    command_type = models.CharField(max_length=100)
    last_check = models.DateTimeField()


class DeviceToken(models.Model):
    """
    The iOS device token model.
    """
    token = models.CharField(max_length=80)
    user = LowerCaseCharField(max_length=255)
    platform = LowerCaseCharField(max_length=32)
    version = LowerCaseCharField(max_length=16)
    pversion = LowerCaseCharField(max_length=16)

    class Meta:
        unique_together = (("token", "user"),)

    def __unicode__(self):
        return "/".join(self.user, self.token)


_CLIENT_LOGIN_TOKEN_EXPIRATION_SECONDS = 30


class ClientLoginTokenManager(models.Manager):
    def get_username(self, tokenstr):
        try:
            token = super(ClientLoginTokenManager, self).get(token=tokenstr)
        except ClientLoginToken.DoesNotExist:
            return None
        username = token.username
        token.delete()
        if not within_time_range(token.timestamp, timezone.now(),
                                 _CLIENT_LOGIN_TOKEN_EXPIRATION_SECONDS):
            return None
        return username


class ClientLoginToken(models.Model):
    # TODO: update sql/mysql.sql and sql/sqlite3.sql
    token = models.CharField(max_length=32, primary_key=True)
    username = models.CharField(max_length=255, db_index=True)
    timestamp = models.DateTimeField(default=timezone.now)

    objects = ClientLoginTokenManager()

    def __unicode__(self):
        return "/".join(self.username, self.token)


class RepoSecretKeyManager(models.Manager):

    def get_secret_key(self, repo_id):
        try:
            repo_secret_key = self.get(repo_id=repo_id)
        except RepoSecretKey.DoesNotExist:
            return None

        return repo_secret_key.secret_key

    def add_secret_key(self, repo_id, secret_key):

        repo_secret_key = self.model(repo_id=repo_id, secret_key=secret_key)
        repo_secret_key.save(using=self._db)

        return repo_secret_key


class RepoSecretKey(models.Model):
    """
    """
    repo_id = models.CharField(unique=True, max_length=36, db_index=True)
    secret_key = models.CharField(max_length=44)

    objects = RepoSecretKeyManager()


class UserMonitoredRepos(models.Model):
    """
    """
    email = models.EmailField(db_index=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = [["email", "repo_id"]]


STATUS_WAITING = 'waiting'
STATUS_SUCCESS = 'success'
STATUS_ERROR = 'error'


class ClientSSOTokenManager(models.Manager):
    def new(self):
        o = self.model()
        o.save(using=self._db)
        return o


class ClientSSOToken(models.Model):
    STATUS_CHOICES = (
        (STATUS_WAITING, 'waiting'),
        (STATUS_SUCCESS, 'success'),
        (STATUS_ERROR, 'error'),
    )

    token = models.CharField(max_length=100, unique=True)
    username = LowerCaseCharField(max_length=255, db_index=True, blank=True, null=True)
    status = models.CharField(max_length=10, default=STATUS_WAITING, choices=STATUS_CHOICES)
    api_key = models.CharField(max_length=40, blank=True, null=True)
    created_at = models.DateTimeField(db_index=True, auto_now_add=True)
    updated_at = models.DateTimeField(db_index=True, blank=True, null=True)
    accessed_at = models.DateTimeField(db_index=True, blank=True, null=True)
    objects = ClientSSOTokenManager()

    def gen_token(self):
        return gen_token(30) + gen_token(30)

    def is_waiting(self):
        return self.status == STATUS_WAITING

    def is_success(self):
        return self.status == STATUS_SUCCESS

    def completed(self, username, api_key):
        assert self.is_waiting() is True

        self.username = username
        self.api_key = api_key
        self.status = STATUS_SUCCESS
        self.updated_at = timezone.now()
        self.save()

    def accessed(self):
        self.accessed_at = timezone.now()
        self.save()

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = self.gen_token()
        return super(ClientSSOToken, self).save(*args, **kwargs)


class RepoTransfer(models.Model):
    repo_id = models.CharField(max_length=36)
    org_id = models.IntegerField(db_index=True)
    from_user = models.CharField(max_length=255)
    to = models.CharField(max_length=255)
    operator = models.CharField(max_length=255)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'RepoTransfer'



GROUP_MEMBER_ADD = 'group_member_add'
GROUP_MEMBER_DELETE = 'group_member_delete'

class GroupMemberAudit(models.Model):
    org_id = models.IntegerField(db_index=True)
    group_id = models.IntegerField(db_index=True)
    user = models.EmailField(db_index=True)
    operator = models.CharField(max_length=255, db_index=True)
    operation = models.CharField(max_length=128)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'group_member_audit'
        


###### signal handler ###############
        
from django.dispatch import receiver


@receiver(group_member_audit)
def add_group_invite_log(sender, org_id, group_id, users, operator, operation, **kwargs):
    if operation not in [GROUP_MEMBER_ADD, GROUP_MEMBER_DELETE]:
        return
    
    group_member_audit_list = []
    for user in users:
        group_member_audit_list.append(GroupMemberAudit(
            org_id=org_id,
            group_id=group_id,
            user=user,
            operator=operator,
            operation=operation
        ))
    GroupMemberAudit.objects.bulk_create(group_member_audit_list)
