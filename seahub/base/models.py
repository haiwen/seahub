import datetime
import logging
import re
from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from pysearpc import SearpcError
from seaserv import seafile_api, get_emailusers

from seahub.auth.signals import user_logged_in
from seahub.shortcuts import get_first_object_or_none
from seahub.base.fields import LowerCaseCharField
from seahub.base.templatetags.seahub_tags import at_pattern
from seahub.group.models import GroupMessage
from seahub.notifications.models import UserNotification
from seahub.profile.models import Profile
from seahub.utils import get_files_last_modified

# Get an instance of a logger
logger = logging.getLogger(__name__)

class UuidObjidMap(models.Model):    
    """
    Model used for store crocdoc uuid and file object id mapping.
    """
    uuid = models.CharField(max_length=40)
    obj_id = models.CharField(max_length=40, unique=True)
        
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
            from seahub.utils import calc_file_path_hash
            self.path_hash = calc_file_path_hash(self.path)
        super(FileDiscuss, self).save(*args, **kwargs)

class FileContributors(models.Model):        
    """(repo_id, file path, file_id, contributors)"""

    repo_id = models.CharField(max_length=36, db_index=True)
    file_id = models.CharField(max_length=40)
    
    file_path = models.TextField()
    file_path_hash = models.CharField(max_length=12)

    last_modified = models.BigIntegerField()
    last_commit_id = models.CharField(max_length=40)

    # email addresses seperated by comma
    emails = models.TextField()


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
        files_list = []
        for sfile in ret:
            if sfile.is_dir:
                continue
            ele = (sfile.repo.id, sfile.path, sfile.file_id)
            files_list.append(ele)

        files_dict_with_last_modified = get_files_last_modified(files_list)

        for sfile in ret:
            key = "%s|%s|%s" % (sfile.repo.id, sfile.path, sfile.file_id)
            if files_dict_with_last_modified.has_key(key):
                sfile.last_modified = files_dict_with_last_modified[key]
            else:
                # Should never reach here
                pass

        ret.sort(lambda x, y: cmp(y.last_modified, x.last_modified))

        return ret
            
class UserStarredFiles(models.Model):
    """Starred files are marked by users to get quick access to it on user
    home page.

    """
    email = models.EmailField()
    org_id = models.IntegerField()
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    is_dir = models.BooleanField()

    objects = UserStarredFilesManager()

class DirFilesLastModifiedInfo(models.Model):
    '''Cache the results of the calculation of last modified time of all the
    files under a directory <parent_dir> in repo <repo_id>.

    The field "last_modified_info" is the json format of a dict whose keys are
    the file names and values are their corresponding last modified
    timestamps.

    The field "dir_id" is used to check whether the cache should be
    re-computed

    '''
    repo_id = models.CharField(max_length=36)
    parent_dir = models.TextField()
    parent_dir_hash = models.CharField(max_length=12)
    dir_id = models.CharField(max_length=40)
    last_modified_info = models.TextField()

    class Meta:
        unique_together = ('repo_id', 'parent_dir_hash')

class FileLastModifiedInfo(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    file_id = models.CharField(max_length=40)
    
    file_path = models.TextField()
    file_path_hash = models.CharField(max_length=12, db_index=True)

    last_modified = models.BigIntegerField()
    email = models.EmailField()

    class Meta:
        unique_together = ('repo_id', 'file_path_hash')

class UserEnabledModule(models.Model):
    username = models.CharField(max_length=255, db_index=True)
    module_name = models.CharField(max_length=20)

class GroupEnabledModule(models.Model):
    group_id = models.CharField(max_length=10, db_index=True)
    module_name = models.CharField(max_length=20)

class UserLastLogin(models.Model):
    username = models.CharField(max_length=255, db_index=True)
    last_login = models.DateTimeField(default=timezone.now)

def update_last_login(sender, user, **kwargs):
    """
    A signal receiver which updates the last_login date for
    the user logging in.
    """
    try:
        user_last_login = UserLastLogin.objects.get(username=user.username)
    except UserLastLogin.DoesNotExist:
        user_last_login = UserLastLogin(username=user.username)
    user_last_login.last_login = timezone.now()
    user_last_login.save()
user_logged_in.connect(update_last_login)

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


        
