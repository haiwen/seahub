import datetime
import logging
import json
from django.db import models, IntegrityError
from django.utils import timezone

from pysearpc import SearpcError
from seaserv import seafile_api

from seahub.auth.signals import user_logged_in
from seahub.group.models import GroupMessage
from seahub.utils import calc_file_path_hash
from fields import LowerCaseCharField


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

            self.path_hash = calc_file_path_hash(self.path)
        super(FileDiscuss, self).save(*args, **kwargs)


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
                dirent = seafile_api.get_dirent_by_path(sfile.repo.id,
                                                        sfile.path)
                sfile.last_modified = dirent.mtime
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

########## last modified info of multiple files under same directory
class DirFilesLastModifiedInfoManager(models.Manager):
    def _calc_dir_files_last_modified(self, repo_id, parent_dir, parent_dir_hash,
                                     dir_id):
        """
        
        Arguments:
        - `self`:
        - `repo_id`:
        - `parent_dir`:
        - `parent_dir_hash`:
        - `dir_id`:
        """
        try:
            ret_list = seafile_api.get_files_last_modified(repo_id, parent_dir, 0)
        except:
            return {}

        # ret_list is like:
        # [
        #    {'file_name': 'xxx', 'last_modified': t1}
        #    {'file_name': 'yyy', 'last_modified': t2}
        # ]
        # and we transform it to:
        # {'xxx': t1, 'yyy': t2}
        last_modified_info = {}
        for entry in ret_list:
            key = entry.file_name
            value = entry.last_modified
            last_modified_info[key] = value
        
        info = self.model(repo_id=repo_id,
                          parent_dir=parent_dir,
                          parent_dir_hash=parent_dir_hash,
                          dir_id=dir_id,
                          last_modified_info=json.dumps(last_modified_info))

        try:
            info.save()
        except IntegrityError, e:
            # If this record is already saved, skip this step.
            pass
        
        return last_modified_info

    def get_dir_files_last_modified(self, repo_id, parent_dir, dir_id=None):
        """Calc the last modified time of all the files under the directory
        <parent_dir> of the repo <repo_id>. Return a dict whose keys are the
        file names and values are their corresponding last modified timestamps.
        
        Arguments:
        - `self`:
        - `repo_id`:
        - `parent_dir`:
        - `dir_id`:
        """
        if not dir_id:
            dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        parent_dir_hash = calc_file_path_hash(parent_dir)
        if not dir_id:
            return {}

        try:
            info = super(DirFilesLastModifiedInfoManager, self).get(
                repo_id=repo_id, parent_dir_hash=parent_dir_hash)
        except self.model.DoesNotExist:
            # no cache yet
            return self._calc_dir_files_last_modified(repo_id, parent_dir,
                                                      parent_dir_hash, dir_id)
        else:
            # cache exist
            if info.dir_id != dir_id:
                # cache is outdated
                info.delete()
                return self._calc_dir_files_last_modified(repo_id, parent_dir,
                                                          parent_dir_hash, dir_id)
            else:
                # cache is valid
                return json.loads(info.last_modified_info)
        
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

    objects = DirFilesLastModifiedInfoManager()

    class Meta:
        unique_together = ('repo_id', 'parent_dir_hash')

########## user/group modules
class UserEnabledModule(models.Model):
    username = models.CharField(max_length=255, db_index=True)
    module_name = models.CharField(max_length=20)

class GroupEnabledModule(models.Model):
    group_id = models.CharField(max_length=10, db_index=True)
    module_name = models.CharField(max_length=20)

########## misc    
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

