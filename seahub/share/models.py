# Copyright (c) 2012-2016 Seafile Ltd.
import datetime
import logging

from django.db import models
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.hashers import make_password, check_password
from constance import config

from seahub.base.fields import LowerCaseCharField
from seahub.utils import normalize_file_path, normalize_dir_path, gen_token,\
    get_service_url

# Get an instance of a logger
logger = logging.getLogger(__name__)


class AnonymousShare(models.Model):
    """
    Model used for sharing repo to unregistered email.
    """
    repo_owner = LowerCaseCharField(max_length=255)
    repo_id = models.CharField(max_length=36)
    anonymous_email = LowerCaseCharField(max_length=255)
    token = models.CharField(max_length=25, unique=True)

def _get_link_key(token, is_upload_link=False):
    return 'visited_ufs_' + token if is_upload_link else \
        'visited_fs_' + token

def set_share_link_access(request, token, is_upload_link=False):
    """Remember which shared download/upload link user can access without
    providing password.
    """
    if request.session:
        link_key = _get_link_key(token, is_upload_link)
        request.session[link_key] = True
    else:
        # should never reach here in normal case
        logger.warn('Failed to remember shared link password, request.session'
                    ' is None when set shared link access.')

def check_share_link_access(request, token, is_upload_link=False):
    """Check whether user can access shared download/upload link without
    providing password.
    """
    link_key = _get_link_key(token, is_upload_link)
    if request.session.get(link_key, False):
        return True
    else:
        return False

def check_share_link_common(request, sharelink, is_upload_link=False):
    """Check if user can view a share link
    """

    msg = ''
    if not sharelink.is_encrypted():
        return (True, msg)

    # if CAN access shared download/upload link without providing password
    # return True
    if check_share_link_access(request, sharelink.token, is_upload_link):
        return (True, msg)

    if request.method != 'POST':
        return (False, msg)

    password = request.POST.get('password', None)
    if not password:
        msg = _("Password can\'t be empty")
        return (False, msg)

    if check_password(password, sharelink.password):
        set_share_link_access(request, sharelink.token, is_upload_link)
        return (True, msg)
    else:
        msg = _("Please enter a correct password.")
        return (False, msg)

class FileShareManager(models.Manager):
    def _add_file_share(self, username, repo_id, path, s_type,
                        password=None, expire_date=None, permission='view_download'):
        if password is not None:
            password_enc = make_password(password)
        else:
            password_enc = None

        token = gen_token(max_length=config.SHARE_LINK_TOKEN_LENGTH)
        fs = super(FileShareManager, self).create(
            username=username, repo_id=repo_id, path=path, token=token,
            s_type=s_type, password=password_enc, expire_date=expire_date,
            permission=permission)
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
                         expire_date=None, permission='view_download'):
        """Create download link for file.
        """
        path = normalize_file_path(path)
        return self._add_file_share(username, repo_id, path, 'f', password,
                                    expire_date, permission)

    def get_file_link_by_path(self, username, repo_id, path):
        path = normalize_file_path(path)
        return self._get_file_share_by_path(username, repo_id, path)

    def get_valid_file_link_by_token(self, token):
        return self._get_valid_file_share_by_token(token)

    def create_dir_link(self, username, repo_id, path, password=None,
                        expire_date=None, permission='view_download'):
        """Create download link for directory.
        """
        path = normalize_dir_path(path)
        return self._add_file_share(username, repo_id, path, 'd', password,
                                    expire_date, permission)

    def get_dir_link_by_path(self, username, repo_id, path):
        path = normalize_dir_path(path)
        return self._get_file_share_by_path(username, repo_id, path)

    def get_valid_dir_link_by_token(self, token):
        return self._get_valid_file_share_by_token(token)

class FileShare(models.Model):
    """
    Model used for file or dir shared link.
    """
    PERM_VIEW_DL = 'view_download'
    PERM_VIEW_ONLY = 'view_only'
    PERMISSION_CHOICES = (
        (PERM_VIEW_DL, 'View and download'),
        (PERM_VIEW_ONLY, 'Disable download'),
    )

    username = LowerCaseCharField(max_length=255, db_index=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    token = models.CharField(max_length=100, unique=True)
    ctime = models.DateTimeField(default=datetime.datetime.now)
    view_cnt = models.IntegerField(default=0)
    s_type = models.CharField(max_length=2, db_index=True, default='f') # `f` or `d`
    password = models.CharField(max_length=128, null=True)
    expire_date = models.DateTimeField(null=True)
    permission = models.CharField(max_length=50, db_index=True,
                                  choices=PERMISSION_CHOICES,
                                  default=PERM_VIEW_DL)

    objects = FileShareManager()

    def is_file_share_link(self):
        return True if self.s_type == 'f' else False

    def is_dir_share_link(self):
        return False if self.is_file_share_link() else True

    def is_encrypted(self):
        return True if self.password is not None else False

    def is_expired(self):
        if self.expire_date is not None and timezone.now() > self.expire_date:
            return True
        else:
            return False

    def is_owner(self, owner):
        return owner == self.username

    def get_full_url(self):
        service_url = get_service_url().rstrip('/')
        if self.is_file_share_link():
            return '%s/f/%s/' % (service_url, self.token)
        else:
            return '%s/d/%s/' % (service_url, self.token)

    def get_permissions(self):
        perm_dict = {}
        if self.permission == FileShare.PERM_VIEW_DL:
            perm_dict['can_preview'] = True
            perm_dict['can_download'] = True
        elif self.permission == FileShare.PERM_VIEW_ONLY:
            perm_dict['can_preview'] = True
            perm_dict['can_download'] = False
        else:
            assert False
        return perm_dict


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
    def _get_upload_link_by_path(self, username, repo_id, path):
        ufs = list(super(UploadLinkShareManager, self).filter(repo_id=repo_id).filter(
            username=username).filter(path=path))
        if len(ufs) > 0:
            return ufs[0]
        else:
            return None

    def get_upload_link_by_path(self, username, repo_id, path):
        path = normalize_dir_path(path)
        return self._get_upload_link_by_path(username, repo_id, path)

    def create_upload_link_share(self, username, repo_id, path,
                                 password=None, expire_date=None):
        path = normalize_dir_path(path)
        token = gen_token(max_length=config.SHARE_LINK_TOKEN_LENGTH)
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
    token = models.CharField(max_length=100, unique=True)
    ctime = models.DateTimeField(default=datetime.datetime.now)
    view_cnt = models.IntegerField(default=0)
    password = models.CharField(max_length=128, null=True)
    expire_date = models.DateTimeField(null=True)
    objects = UploadLinkShareManager()

    def is_encrypted(self):
        return True if self.password is not None else False

    def is_owner(self, owner):
        return owner == self.username

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

###### signal handlers
from django.dispatch import receiver
from seahub.signals import repo_deleted

@receiver(repo_deleted)
def remove_share_links(sender, **kwargs):
    repo_id = kwargs['repo_id']

    FileShare.objects.filter(repo_id=repo_id).delete()
    UploadLinkShare.objects.filter(repo_id=repo_id).delete()
