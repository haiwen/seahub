import datetime
import logging
import simplejson as json
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

########## file contributors
class FileContributorsManager(models.Manager):
    def _get_file_contributors_from_revisions(self, repo_id, file_path):
        """Inspect the file history and get a list of users who have modified
        the file.

        """
        commits = []
        try:
            commits = seafile_api.get_file_revisions(repo_id, file_path, -1, -1)
        except SearpcError, e:
            return [], 0, ''

        if not commits:
            return [], 0, ''

        # Commits are already sorted by date, so the user list is also sorted.
        users = [ commit.creator_name for commit in commits if commit.creator_name ]

        # Remove duplicate elements in a list
        email_list = []
        for user in users:
            if user not in email_list:
                email_list.append(user)

        return email_list, commits[0].ctime, commits[0].id
    
    def get_file_contributors(self, repo_id, file_path, file_path_hash, file_id):
        """Get file contributors list and last modified time from database cache.
        If not found in cache, try to get it from seaf-server.

        
        Arguments:
        - `self`:
        - `repo_id`:
        - `file_path`:
        - `file_path_hash`:
        - `file_id`:
        """
        contributors = []
        last_modified = 0
        last_commit_id = ''
        try:
            # HACK: Fixed the unique key bug in 1.1
            # Should be removed in future
            fc = super(FileContributorsManager, self).filter(
                repo_id=repo_id, file_path_hash=file_path_hash)
            if not fc:
                raise self.model.DoesNotExist
            else:
                if len(fc) > 1:
                    for e in fc[1:]:
                        e.delete()
                fc = fc[0]
        except FileContributors.DoesNotExist:
            # has no cache yet
            contributors, last_modified, last_commit_id = self._get_file_contributors_from_revisions (repo_id, file_path)
            if not contributors:
                return [], 0, ''
            emails = ','.join(contributors)
            file_contributors = self.model(repo_id=repo_id,
                                           file_id=file_id,
                                           file_path=file_path,
                                           file_path_hash=file_path_hash,
                                           last_modified=last_modified,
                                           last_commit_id=last_commit_id,
                                           emails=emails)
            file_contributors.save()
        else:
            # cache found
            if fc.file_id != file_id or not fc.last_commit_id:
                # but cache is outdated
                fc.delete()
                contributors, last_modified, last_commit_id = self._get_file_contributors_from_revisions (repo_id, file_path)
                if not contributors:
                    return [], 0, ''
                emails = ','.join(contributors)
                file_contributors = self.model(repo_id=repo_id,
                                               file_id=file_id,
                                               file_path=file_path,
                                               file_path_hash=file_path_hash,
                                               last_modified=last_modified,
                                               last_commit_id=last_commit_id,
                                               emails=emails)
                file_contributors.save()
            else:
                # cache is valid
                if fc.emails:
                    contributors = fc.emails.split(',')
                else:
                    contributors = []
                last_modified = fc.last_modified
                last_commit_id = fc.last_commit_id

        return contributors, last_modified, last_commit_id 
        
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

    objects = FileContributorsManager()

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
        files_list = []
        for sfile in ret:
            if sfile.is_dir:
                continue
            ele = (sfile.repo.id, sfile.path, sfile.file_id)
            files_list.append(ele)

        files_dict_with_last_modified = FileLastModifiedInfo.objects.get_files_last_modified(files_list)

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

########## last modified info of a sigle file
class FileLastModifiedInfoManager(models.Manager):
    def _calc_file_last_modified(self, repo_id, file_path, file_path_hash,
                                 file_id):
        try:
            # get the lastest one file revision
            commits = seafile_api.get_file_revisions(repo_id, file_path, 1, -1)
        except SearpcError, e:
            return '', 0

        if not commits:
            return '', 0

        email, last_modified = commits[0].creator_name, commits[0].ctime
        info = self.model(repo_id=repo_id,
                          file_path=file_path,
                          file_path_hash=file_path_hash,
                          file_id=file_id,
                          last_modified=last_modified,
                          email=email)

        try:
            info.save()
        except IntegrityError:
            # Remove corrupted data, waiting for next insertion.
            super(FileLastModifiedInfoManager, self).filter(
                repo_id=repo_id, file_path_hash=file_path_hash).delete()

        return email, last_modified
        
    def get_file_last_modified(self, repo_id, file_path):
        """
        
        Arguments:
        - `self`:
        - `repo_id`:
        - `file_path`:
        """
        last_modified = 0
        file_path_hash = calc_file_path_hash(file_path)
        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        try:
            fc = super(FileLastModifiedInfoManager, self).get(
                repo_id=repo_id, file_path_hash=file_path_hash)
        except self.model.DoesNotExist:
            # has no cache yet
            user, last_modified = self._calc_file_last_modified(
                repo_id, file_path, file_path_hash, file_id)
        else:
            # cache found
            if fc.file_id != file_id:
                # but cache is outdated
                fc.delete()
                user, last_modified = self._calc_file_last_modified(
                    repo_id, file_path, file_path_hash, file_id)
            else:
                # cache is valid
                user, last_modified = fc.email, fc.last_modified

        return user, last_modified
        
    def get_files_last_modified(self, files_list):
        """Batch calculate file last modification file.

        Arguments:
        - `files_list`: A list contains repo id and file path and file id.

        For example:
    
        [
        (u'66a7aaaf-0b59-4c22-9f7a-52606e8fbee3', u'/Chrys (1).jpg', u'c5ee20b7ecf5c44bd184cf64c775aad769f50399'),
        (u'66a7aaaf-0b59-4c22-9f7a-52606e8fbee3', u'/Chrys (2).jpg', u'd5ee20b7ecf5c44bd184cf64c775aad769f50399'),
        (u'66a7aaaf-0b59-4c22-9f7a-52606e8fbee3', u'/foo.pdf', u'f78b579f757cec44a99d420331a06ad752b30153'),

        ...
    	]

        Returns:
            A dict mapping keys to the repo id and file path, seperated by "|",
            and values to the last modification time. For example:

        {
        u'66a7aaaf-0b59-4c22-9f7a-52606e8fbee3|/Chrys (1).jpg|c5ee20b7ecf5c44bd184cf64c775aad769f50399': 1374549194,
        u'66a7aaaf-0b59-4c22-9f7a-52606e8fbee3|/Chrys (2).jpg|d5ee20b7ecf5c44bd184cf64c775aad769f50399': 1374585247,
        u'66a7aaaf-0b59-4c22-9f7a-52606e8fbee3|/foo.pdf|f78b579f757cec44a99d420331a06ad752b30153': 1362471870,

        ...
        }
    
        """
        filepath_hash_set = set()
        ret_dict = {}

        for e in files_list:
            repo_id, file_path, file_id = e
            path_hash = calc_file_path_hash(file_path)
            filepath_hash_set.add(path_hash)

        m_infos = super(FileLastModifiedInfoManager, self).filter(
            file_path_hash__in=list(filepath_hash_set))
        for f in files_list:
            repo_id, file_path, file_id = f
            for info in m_infos:
                if repo_id == info.repo_id and file_path == info.file_path:
                    # Got the record in db
                    ret_key = '|'.join(f)
                    if file_id != info.file_id:
                        # record is outdated, need re-calculate
                        info.delete()
                        email, last_modified = self._calc_file_last_modified(
                            info.repo_id, info.file_path, info.file_path_hash,
                            file_id)
                        ret_dict[ret_key] = last_modified
                        continue
                    else:
                        # record is valid
                        ret_dict[ret_key] = info.last_modified
                        continue
        
        # Process the remaining files.
        for f in files_list:
            ret_key = '|'.join(f)
            if ret_dict.has_key(ret_key):
                continue

            repo_id, file_path, file_id = f
            path_hash = calc_file_path_hash(file_path)
            email, last_modified = self._calc_file_last_modified(
                repo_id, file_path, path_hash, file_id)
            ret_dict[ret_key] = last_modified
        
        return ret_dict
        
class FileLastModifiedInfo(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    file_id = models.CharField(max_length=40)
    file_path = models.TextField()
    file_path_hash = models.CharField(max_length=12, db_index=True)
    last_modified = models.BigIntegerField()
    email = models.EmailField()

    objects = FileLastModifiedInfoManager()

    class Meta:
        unique_together = ('repo_id', 'file_path_hash')

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

