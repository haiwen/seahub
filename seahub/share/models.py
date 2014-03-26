import datetime
from django.db import models
from django.utils import timezone

from seahub.base.fields import LowerCaseCharField
from seahub.utils import normalize_file_path, normalize_dir_path, gen_token

class AnonymousShare(models.Model):
    """
    Model used for sharing repo to unregistered email.
    """
    repo_owner = LowerCaseCharField(max_length=255)
    repo_id = models.CharField(max_length=36)
    anonymous_email = LowerCaseCharField(max_length=255)
    token = models.CharField(max_length=25, unique=True)

class FileShareManager(models.Manager):
    def _add_file_share(self, username, repo_id, path, s_type):
        token = gen_token(max_length=10)
        fs = super(FileShareManager, self).create(
            username=username, repo_id=repo_id, path=path, token=token,
            s_type=s_type)
        fs.save()
        return fs

    def _get_file_share_by_path(self, username, repo_id, path):
        fs = list(super(FileShareManager, self).filter(repo_id=repo_id).filter(
            username=username).filter(path=path))
        if len(fs) > 0:
            return fs[0]
        else:
            return None

    def _get_valid_file_share_by_token(self, token):
        """Check whether token exists and not expire.
        """
        try:
            fs = self.get(token=token)
        except self.model.DoesNotExist:
            return None

        return fs

    ########## public methods ##########
    def create_file_link(self, username, repo_id, path):
        path = normalize_file_path(path)
        return self._add_file_share(username, repo_id, path, 'f')

    def get_file_link_by_path(self, username, repo_id, path):
        path = normalize_file_path(path)
        return self._get_file_share_by_path(username, repo_id, path)

    def get_valid_file_link_by_token(self, token):
        return self._get_valid_file_share_by_token(token)
    
    def create_dir_link(self, username, repo_id, path):
        path = normalize_dir_path(path)
        return self._add_file_share(username, repo_id, path, 'd')
    
    def get_dir_link_by_path(self, username, repo_id, path):
        path = normalize_dir_path(path)
        return self._get_file_share_by_path(username, repo_id, path)
    
    def get_valid_dir_link_by_token(self, token):
        return self._get_valid_file_share_by_token(token)

class FileShare(models.Model):
    """
    Model used for file or dir shared link.
    """
    username = LowerCaseCharField(max_length=255, db_index=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    token = models.CharField(max_length=10, unique=True)
    ctime = models.DateTimeField(default=datetime.datetime.now)
    view_cnt = models.IntegerField(default=0)
    s_type = models.CharField(max_length=2, db_index=True, default='f') # `f` or `d`

    objects = FileShareManager()

class UploadLinkShare(models.Model):
    """
    Model used for shared upload link.
    """
    username = LowerCaseCharField(max_length=255, db_index=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    token = models.CharField(max_length=10, unique=True)
    ctime = models.DateTimeField(default=datetime.datetime.now)
    view_cnt = models.IntegerField(default=0)

class PrivateFileDirShareManager(models.Manager):
    def add_private_file_share(self, from_user, to_user, repo_id, path, perm):
        """
        """
        path = normalize_file_path(path)
        token = gen_token(max_length=10)

        pfs = self.model(from_user=from_user, to_user=to_user, repo_id=repo_id,
                         path=path, s_type='f', token=token, permission=perm)
        pfs.save(using=self._db)
        return pfs

    def add_read_only_priv_file_share(self, from_user, to_user, repo_id, path):
        """
        """
        return self.add_private_file_share(from_user, to_user, repo_id,
                                           path, 'r')
        
    def get_private_share_in_file(self, username, repo_id, path):
        """Get a file that private shared to ``username``.
        """
        path = normalize_file_path(path)
        
        ret = super(PrivateFileDirShareManager, self).filter(
            to_user=username, repo_id=repo_id, path=path, s_type='f')
        return ret[0] if len(ret) > 0 else None
        
    def add_private_dir_share(self, from_user, to_user, repo_id, path, perm):
        """
        """
        path = normalize_dir_path(path)
        token = gen_token(max_length=10)
        
        pfs = self.model(from_user=from_user, to_user=to_user, repo_id=repo_id,
                         path=path, s_type='d', token=token, permission=perm)
        pfs.save(using=self._db)
        return pfs

    def get_private_share_in_dir(self, username, repo_id, path):
        """Get a directory that private shared to ``username``.
        """
        path = normalize_dir_path(path)

        ret = super(PrivateFileDirShareManager, self).filter(
            to_user=username, repo_id=repo_id, path=path, s_type='d')
        return ret[0] if len(ret) > 0 else None

    def get_priv_file_dir_share_by_token(self, token):
        return super(PrivateFileDirShareManager, self).get(token=token)
        
    def delete_private_file_dir_share(self, from_user, to_user, repo_id, path):
        """
        """
        super(PrivateFileDirShareManager, self).filter(
            from_user=from_user, to_user=to_user, repo_id=repo_id,
            path=path).delete()

    def list_private_share_out_by_user(self, from_user):
        """List files/directories private shared from ``from_user``.
        """
        return super(PrivateFileDirShareManager, self).filter(
            from_user=from_user)

    def list_private_share_in_by_user(self, to_user):
        """List files/directories private shared to ``to_user``.
        """
        return super(PrivateFileDirShareManager, self).filter(
            to_user=to_user)

    def list_private_share_in_dirs_by_user_and_repo(self, to_user, repo_id):
        """List directories private shared to ``to_user`` base on ``repo_id``.
        """
        return super(PrivateFileDirShareManager, self).filter(
            to_user=to_user, repo_id=repo_id, s_type='d')

class PrivateFileDirShare(models.Model):
    from_user = LowerCaseCharField(max_length=255, db_index=True)
    to_user = LowerCaseCharField(max_length=255, db_index=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    token = models.CharField(max_length=10, unique=True)
    permission = models.CharField(max_length=5)           # `r` or `rw`
    s_type = models.CharField(max_length=5, default='f') # `f` or `d`
    objects = PrivateFileDirShareManager()
