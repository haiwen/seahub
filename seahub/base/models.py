# Copyright (c) 2012-2016 Seafile Ltd.
import os
import datetime
import hashlib
import logging
from django.db import models
from django.utils import timezone

from pysearpc import SearpcError
from seaserv import seafile_api

from seahub.auth.signals import user_logged_in
from seahub.group.models import GroupMessage
from seahub.utils import calc_file_path_hash, within_time_range
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.tags.models import FileUUIDMap
from fields import LowerCaseCharField


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


class FileDiscuss(models.Model):
    """
    Model used to represents the relationship between group message and file/dir.
    """
    group_message = models.ForeignKey(GroupMessage)
    repo_id = models.CharField(max_length=36)
    path = models.TextField()
    path_hash = models.CharField(max_length=12, db_index=True)

    def save(self, *args, **kwargs):
        if not self.path_hash:
            self.path_hash = calc_file_path_hash(self.path)

        super(FileDiscuss, self).save(*args, **kwargs)


class FileCommentManager(models.Manager):
    def add(self, repo_id, parent_path, item_name, author, comment):
        fileuuidmap = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, 
                                                                    parent_path, 
                                                                    item_name, 
                                                                    False)
        c = self.model(uuid=fileuuidmap, author=author, comment=comment)
        c.save(using=self._db)
        return c

    def add_by_file_path(self, repo_id, file_path, author, comment):
        file_path = self.model.normalize_path(file_path)
        parent_path = os.path.dirname(file_path)
        item_name = os.path.basename(file_path)

        return self.add(repo_id, parent_path, item_name, author, comment)

    def get_by_file_path(self, repo_id, file_path):
        parent_path = os.path.dirname(file_path)
        item_name = os.path.basename(file_path)
        uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(repo_id, parent_path, 
                                                           item_name, False)

        objs = super(FileCommentManager, self).filter(
            uuid=uuid)

        return objs

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
    objects = FileCommentManager()

    @classmethod
    def normalize_path(self, path):
        return path.rstrip('/') if path != '/' else '/'

    def to_dict(self):
        o = self
        return {
            'id': o.pk,
            'repo_id': o.uuid.repo_id,
            'parent_path': o.uuid.parent_path,
            'item_name': o.uuid.filename,
            'comment': o.comment,
            'created_at': datetime_to_isoformat_timestr(o.created_at),
        }


########## starred files
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
    def get_starred_files_by_username(self, username):
        """Get a user's starred files.

        Arguments:
        - `self`:
        - `username`:
        """
        starred_files = super(UserStarredFilesManager, self).filter(
            email=username, org_id=-1)

        ret = []
        repo_cache = {}
        for sfile in starred_files:
            # repo still exists?
            if repo_cache.has_key(sfile.repo_id):
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
            size = -1
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

            f = StarredFile(sfile.org_id, repo, file_id, sfile.path,
                            sfile.is_dir, 0) # TODO: remove ``size`` from StarredFile
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

        ret.sort(lambda x, y: cmp(y.last_modified, x.last_modified))

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

########## user/group modules
class UserEnabledModule(models.Model):
    username = models.CharField(max_length=255, db_index=True)
    module_name = models.CharField(max_length=20)

class GroupEnabledModule(models.Model):
    group_id = models.CharField(max_length=10, db_index=True)
    module_name = models.CharField(max_length=20)

########## misc
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

class CommandsLastCheck(models.Model):
    """Record last check time for Django/custom commands.
    """
    command_type = models.CharField(max_length=100)
    last_check = models.DateTimeField()

###### Deprecated
class InnerPubMsg(models.Model):
    """
    Model used for leave message on inner pub page.
    """
    from_email = models.EmailField()
    message = models.CharField(max_length=500)
    timestamp = models.DateTimeField(default=datetime.datetime.now)

    class Meta:
        ordering = ['-timestamp']

class InnerPubMsgReply(models.Model):
    reply_to = models.ForeignKey(InnerPubMsg)
    from_email = models.EmailField()
    message = models.CharField(max_length=150)
    timestamp = models.DateTimeField(default=datetime.datetime.now)
##############################

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
