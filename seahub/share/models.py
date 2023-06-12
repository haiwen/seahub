# Copyright (c) 2012-2016 Seafile Ltd.
import os
import json
import logging
import operator
import datetime
from functools import reduce
from constance import config

from django.db import models
from django.db.models import Q
from django.dispatch import receiver
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.hashers import check_password

from seahub.signals import repo_deleted
from seahub.base.fields import LowerCaseCharField
from seahub.utils.hasher import AESPasswordHasher
from seahub.utils import normalize_file_path, normalize_dir_path, gen_token,\
    get_service_url, is_valid_org_id
from seahub.constants import PERMISSION_READ, PERMISSION_ADMIN


# Get an instance of a logger
logger = logging.getLogger(__name__)


def make_password(password):

    aes = AESPasswordHasher()
    return aes.encode(password)


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

    if check_password(password, sharelink.password) or password == sharelink.get_password():
        set_share_link_access(request, sharelink.token, is_upload_link)
        return (True, msg)
    else:
        msg = _("Please enter a correct password.")
        return (False, msg)


class FileShareManager(models.Manager):

    def _add_file_share(self, username, repo_id, path, s_type,
                        password=None, expire_date=None,
                        permission='view_download', org_id=None):

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

        if is_valid_org_id(org_id):
            OrgFileShare.objects.set_org_file_share(org_id, fs)

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

    # public methods
    def create_file_link(self, username, repo_id, path, password=None,
                         expire_date=None, permission='view_download',
                         org_id=None):
        """Create download link for file.
        """
        path = normalize_file_path(path)
        return self._add_file_share(username, repo_id, path, 'f', password,
                                    expire_date, permission, org_id)

    def get_file_link_by_path(self, username, repo_id, path):
        path = normalize_file_path(path)
        return self._get_file_share_by_path(username, repo_id, path)

    def get_valid_file_link_by_token(self, token):
        return self._get_valid_file_share_by_token(token)

    def create_dir_link(self, username, repo_id, path, password=None,
                        expire_date=None, permission='view_download',
                        org_id=None):
        """Create download link for directory.
        """
        path = normalize_dir_path(path)
        return self._add_file_share(username, repo_id, path, 'd', password,
                                    expire_date, permission, org_id)

    def get_dir_link_by_path(self, username, repo_id, path):
        path = normalize_dir_path(path)
        return self._get_file_share_by_path(username, repo_id, path)

    def get_valid_dir_link_by_token(self, token):
        return self._get_valid_file_share_by_token(token)


class ExtraSharePermissionManager(models.Manager):
    def get_user_permission(self, repo_id, username):
        """Get user's permission of a library.
        return
            e.g. 'admin'
        """
        record_list = super(ExtraSharePermissionManager, self).filter(
            repo_id=repo_id, share_to=username
        )
        if len(record_list) > 0:
            return record_list[0].permission
        else:
            return None

    def get_repos_with_admin_permission(self, username):
        """Get repo id list a user has admin permission.
        """
        shared_repos = super(ExtraSharePermissionManager, self).filter(
            share_to=username, permission=PERMISSION_ADMIN
        )
        return [e.repo_id for e in shared_repos]

    def get_admin_users_by_repo(self, repo_id):
        """Gets the share and permissions of the record in the specified repo ID.
        return
            e.g. ['admin_user1', 'admin_user2']
        """
        shared_repos = super(ExtraSharePermissionManager, self).filter(
            repo_id=repo_id, permission=PERMISSION_ADMIN
        )

        return [e.share_to for e in shared_repos]

    def batch_is_admin(self, in_datas):
        """return the data that input data is admin
        e.g.
            in_datas:
                [(repo_id1, username1), (repo_id2, admin1)]
            admin permission data returnd:
                [(repo_id2, admin1)]
        """
        if len(in_datas) <= 0:
            return []
        query = reduce(
            operator.or_,
            (Q(repo_id=data[0], share_to=data[1]) for data in in_datas)
        )
        db_data = super(ExtraSharePermissionManager, self).filter(query).filter(permission=PERMISSION_ADMIN)
        return [(e.repo_id, e.share_to) for e in db_data]

    def create_share_permission(self, repo_id, username, permission):
        self.model(repo_id=repo_id, share_to=username,
                   permission=permission).save()

    def delete_share_permission(self, repo_id, share_to):
        super(ExtraSharePermissionManager, self).filter(repo_id=repo_id,
                                                        share_to=share_to).delete()

    def update_share_permission(self, repo_id, share_to, permission):
        super(ExtraSharePermissionManager, self).filter(repo_id=repo_id,
                                                        share_to=share_to).delete()
        if permission in [PERMISSION_ADMIN]:
            self.create_share_permission(repo_id, share_to, permission)


class ExtraGroupsSharePermissionManager(models.Manager):

    def get_group_permission(self, repo_id, gid):
        record_list = super(ExtraGroupsSharePermissionManager, self).filter(
            repo_id=repo_id, group_id=gid
        )
        if len(record_list) > 0:
            return record_list[0].permission
        else:
            return None

    def get_repos_with_admin_permission(self, gid):
        """ return admin repo in specific group
            e.g: ['repo_id1', 'repo_id2']
        """
        return super(ExtraGroupsSharePermissionManager, self).filter(
            group_id=gid, permission='admin'
        ).values_list('repo_id', flat=True)

    def get_admin_groups_by_repo(self, repo_id):
        """ return admin groups in specific repo
            e.g: ['23', '12']
        """
        return super(ExtraGroupsSharePermissionManager, self).filter(
            repo_id=repo_id, permission='admin'
        ).values_list('group_id', flat=True)

    def batch_get_repos_with_admin_permission(self, gids):
        """
        """
        if len(gids) <= 0:
            return []
        db_data = super(ExtraGroupsSharePermissionManager, self).filter(group_id__in=gids, permission=PERMISSION_ADMIN)
        return [(e.repo_id, e.group_id) for e in db_data]

    def create_share_permission(self, repo_id, gid, permission):
        self.model(repo_id=repo_id, group_id=gid, permission=permission).save()

    def delete_share_permission(self, repo_id, gid):
        super(ExtraGroupsSharePermissionManager, self).filter(repo_id=repo_id,
                                                              group_id=gid).delete()

    def update_share_permission(self, repo_id, gid, permission):
        super(ExtraGroupsSharePermissionManager, self).filter(repo_id=repo_id,
                                                              group_id=gid).delete()
        if permission in [PERMISSION_ADMIN]:
            self.create_share_permission(repo_id, gid, permission)


class ExtraGroupsSharePermission(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    group_id = models.IntegerField(db_index=True)
    permission = models.CharField(max_length=30)
    objects = ExtraGroupsSharePermissionManager()


class ExtraSharePermission(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    share_to = models.CharField(max_length=255, db_index=True)
    permission = models.CharField(max_length=30)
    objects = ExtraSharePermissionManager()


class FileShare(models.Model):
    """
    Model used for file or dir shared link.
    """
    PERM_VIEW_DL = 'view_download'
    PERM_VIEW_ONLY = 'view_only'

    PERM_EDIT_DL = 'edit_download'
    PERM_EDIT_ONLY = 'edit_only'

    PERM_VIEW_DL_UPLOAD = 'view_download_upload'

    PERMISSION_CHOICES = (
        (PERM_VIEW_DL, 'Preview only and can download'),
        (PERM_VIEW_ONLY, 'Preview only and disable download'),
        (PERM_EDIT_DL, 'Edit and can download'),
        (PERM_EDIT_ONLY, 'Edit and disable download'),
        (PERM_VIEW_DL_UPLOAD, 'Preview only and can download and upload'),
    )

    username = LowerCaseCharField(max_length=255, db_index=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()
    token = models.CharField(max_length=100, unique=True)
    ctime = models.DateTimeField(default=datetime.datetime.now)
    view_cnt = models.IntegerField(default=0)
    s_type = models.CharField(max_length=2, db_index=True, default='f')  # `f` or `d`
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
            perm_dict['can_edit'] = False
            perm_dict['can_download'] = True
            perm_dict['can_upload'] = False
        elif self.permission == FileShare.PERM_VIEW_ONLY:
            perm_dict['can_edit'] = False
            perm_dict['can_download'] = False
            perm_dict['can_upload'] = False
        elif self.permission == FileShare.PERM_EDIT_DL:
            perm_dict['can_edit'] = True
            perm_dict['can_download'] = True
            perm_dict['can_upload'] = False
        elif self.permission == FileShare.PERM_EDIT_ONLY:
            perm_dict['can_edit'] = True
            perm_dict['can_download'] = False
            perm_dict['can_upload'] = False
        elif self.permission == FileShare.PERM_VIEW_DL_UPLOAD:
            perm_dict['can_edit'] = False
            perm_dict['can_download'] = True
            perm_dict['can_upload'] = True
        else:
            assert False
        return perm_dict

    def get_obj_name(self):
        if self.path:
            return '/' if self.path == '/' else os.path.basename(self.path.rstrip('/'))
        return ''

    def get_password(self):

        if self.password:
            try:
                aes = AESPasswordHasher()
                return aes.decode(self.password)
            except Exception:
                logger.error('Error occurred when get share link password')
                return ''
        else:
            return ''


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
    file_share = models.OneToOneField(FileShare, on_delete=models.CASCADE)
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

    def is_expired(self):
        if self.expire_date is not None and timezone.now() > self.expire_date:
            return True
        else:
            return False

    def get_password(self):

        if self.password:
            try:
                aes = AESPasswordHasher()
                return aes.decode(self.password)
            except Exception:
                logger.error('Error occurred when get share link password')
                return ''
        else:
            return ''


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
                                           path, PERMISSION_READ)

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
    permission = models.CharField(max_length=5)  # `r` or `rw`
    s_type = models.CharField(max_length=5, default='f')  # `f` or `d`
    objects = PrivateFileDirShareManager()


class CustomSharePermissionsManager(models.Manager):
    def get_permissions_by_repo_id(self, repo_id):
        return super(CustomSharePermissionsManager, self).filter(repo_id=repo_id)

    def add_permission(self, repo_id, name, description, permission):
        permission_obj = self.model(repo_id=repo_id, name=name,
                                    description=description, permission=permission)
        permission_obj.save(using=self._db)
        return permission_obj


class CustomSharePermissions(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=500)
    permission = models.TextField()

    objects = CustomSharePermissionsManager()

    class Meta:
        db_table = 'custom_share_permission'

    def to_dict(self):
        try:
            permission = json.loads(self.permission)
        except Exception as e:
            logger.error('Failed to deserialize permission: %s' % e)
            permission = {}
        return {
            'id': self.pk,
            'name': self.name,
            'description': self.description,
            'permission': permission,
        }


# signal handlers

@receiver(repo_deleted)
def remove_share_info(sender, **kwargs):
    repo_id = kwargs['repo_id']

    FileShare.objects.filter(repo_id=repo_id).delete()
    UploadLinkShare.objects.filter(repo_id=repo_id).delete()

    # remove record of extra share
    ExtraSharePermission.objects.filter(repo_id=repo_id).delete()
    ExtraGroupsSharePermission.objects.filter(repo_id=repo_id).delete()

    CustomSharePermissions.objects.filter(repo_id=repo_id).delete()
