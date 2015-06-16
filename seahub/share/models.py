import datetime
from django.core.cache import cache
from django.db import models
from django.utils import timezone
from django.contrib.auth.hashers import make_password

from seahub.base.fields import LowerCaseCharField
from seahub.utils import normalize_file_path, normalize_dir_path, gen_token, \
    normalize_cache_key
from seahub.utils.ip import get_remote_ip
from seahub.settings import SHARE_ACCESS_PASSWD_TIMEOUT

class AnonymousShare(models.Model):
    """
    Model used for sharing repo to unregistered email.
    """
    repo_owner = LowerCaseCharField(max_length=255)
    repo_id = models.CharField(max_length=36)
    anonymous_email = LowerCaseCharField(max_length=255)
    token = models.CharField(max_length=25, unique=True)

def _get_cache_key(request, prefix, token):
    """Return cache key of certain ``prefix``. If user is logged in, use
    username and token, otherwise use combination of request ip and user agent
    and token.

    Arguments:
    - `prefix`:
    """
    if request.user.is_authenticated():
        key = normalize_cache_key(request.user.username, 'SharedLink_', token)
    else:
        ip = get_remote_ip(request)
        # Memcached key length limit is 250 chars, and user agent sometimes may
        # be long which will cause error.
        agent = request.META.get('HTTP_USER_AGENT', '')[:150]
        key = normalize_cache_key(ip + agent, 'SharedLink_', token)

    return key

def set_share_link_access(request, token):
    """Remember which share download/upload links user can access without
    providing password.
    """
    key = _get_cache_key(request, 'SharedLink_', token)
    cache.set(key, True, SHARE_ACCESS_PASSWD_TIMEOUT)

def check_share_link_access(request, token):
    """Check whether user can access share link without providing password.
    """
    key = _get_cache_key(request, 'SharedLink_', token)
    return cache.get(key, False)

class FileShareManager(models.Manager):
    def _add_file_share(self, username, repo_id, path, s_type,
                        password=None, expire_date=None):
        if password is not None:
            password_enc = make_password(password)
        else:
            password_enc = None

        token = gen_token(max_length=10)
        fs = super(FileShareManager, self).create(
            username=username, repo_id=repo_id, path=path, token=token,
            s_type=s_type, password=password_enc, expire_date=expire_date)
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
        """Return share link that exists and not expire, otherwise none.
        """
        try:
            fs = self.get(token=token)
        except self.model.DoesNotExist:
            return None

        if fs.expire_date is None:
            return fs
        else:
            if timezone.now() > fs.expire_date:
                return None
            else:
                return fs

    ########## public methods ##########
    def create_file_link(self, username, repo_id, path, password=None,
                         expire_date=None):
        """Create download link for file.
        """
        path = normalize_file_path(path)
        return self._add_file_share(username, repo_id, path, 'f', password,
                                    expire_date)

    def get_file_link_by_path(self, username, repo_id, path):
        path = normalize_file_path(path)
        return self._get_file_share_by_path(username, repo_id, path)

    def get_valid_file_link_by_token(self, token):
        return self._get_valid_file_share_by_token(token)

    def create_dir_link(self, username, repo_id, path, password=None,
                        expire_date=None):
        """Create download link for directory.
        """
        path = normalize_dir_path(path)
        return self._add_file_share(username, repo_id, path, 'd', password,
                                    expire_date)

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
    password = models.CharField(max_length=128, null=True)
    expire_date = models.DateTimeField(null=True)
    objects = FileShareManager()

    def is_file_share_link(self):
        return True if self.s_type == 'f' else False

    def is_dir_share_link(self):
        return False if self.is_file_share_link() else True

    def is_encrypted(self):
        return True if self.password is not None else False

class OrgFileShareManager(models.Manager):
    def set_org_file_share(self, org_id, file_share):
        """Set a share link as org share link.
        
        Arguments:
        - `org_id`:
        - `file_share`:
        """
        ofs = self.model(org_id=org_id, file_share=file_share)
        ofs.save(using=self._db)
        return ofs
        
class OrgFileShare(models.Model):
    """
    Model used for organization file or dir shared link.
    """
    org_id = models.IntegerField(db_index=True)
    file_share = models.OneToOneField(FileShare)
    objects = OrgFileShareManager()

    objects = OrgFileShareManager()

class UploadLinkShareManager(models.Manager):
    def create_upload_link_share(self, username, repo_id, path,
                                 password=None, expire_date=None):
        path = normalize_dir_path(path)
        token = gen_token(max_length=10)
        if password is not None:
            password_enc = make_password(password)
        else:
            password_enc = None
        uls = super(UploadLinkShareManager, self).create(
            username=username, repo_id=repo_id, path=path, token=token,
            password=password_enc, expire_date=expire_date)
        uls.save()
        return uls

    def get_valid_upload_link_by_token(self, token):
        """Return upload link that exists and not expire, otherwise none.
        """
        try:
            fs = self.get(token=token)
        except self.model.DoesNotExist:
            return None

        if fs.expire_date is None:
            return fs
        else:
            if timezone.now() > fs.expire_date:
                return None
            else:
                return fs

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
    password = models.CharField(max_length=128, null=True)
    expire_date = models.DateTimeField(null=True)
    objects = UploadLinkShareManager()

    def is_encrypted(self):
        return True if self.password is not None else False

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
