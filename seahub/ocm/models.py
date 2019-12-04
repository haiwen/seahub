from _sha1 import sha1

import hmac
import uuid

from django.db import models
from django.conf import settings
from seahub.constants import PERMISSION_READ_WRITE, PERMISSION_READ
from seahub.utils.timeutils import datetime_to_isoformat_timestr

PERMISSION_CHOICES = (
    (PERMISSION_READ_WRITE, 'read, write'),
    (PERMISSION_READ, 'read'),
)


class OCMShareManager(models.Manager):

    @staticmethod
    def generate_key():
        unique = str(uuid.uuid4())
        return hmac.new(unique.encode('utf-8'), digestmod=sha1).hexdigest()

    def gen_token(self, to_user, to_server_url):
        # if is same user at same remote server
        # token should be same
        ocm_share = OCMShare.objects.filter(to_user=to_user, to_server_url=to_server_url)
        if ocm_share:
            token = ocm_share[0].token
        else:
            token = self.generate_key()
        return token

    def create_ocm_share(self, shared_secret, from_user, to_user, to_server_url, repo_id, repo_name, permission, token, path='/'):
        ocm_share = super(OCMShareManager, self).create(shared_secret=shared_secret,
                                                  from_user=from_user,
                                                  to_user=to_user,
                                                  to_server_url=to_server_url,
                                                  repo_id=repo_id,
                                                  repo_name=repo_name,
                                                  path=path,
                                                  permission=permission,
                                                  token=token)
        return ocm_share


class OCMShare(models.Model):
    shared_secret = models.CharField(max_length=36, db_index=True, unique=True)
    from_user = models.CharField(max_length=255, db_index=True)
    to_user = models.CharField(max_length=255, db_index=True)
    to_server_url = models.URLField(db_index=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    repo_name = models.CharField(max_length=settings.MAX_FILE_NAME)
    permission = models.CharField(max_length=50, choices=PERMISSION_CHOICES)
    token = models.CharField(max_length=40, db_index=True)
    path = models.TextField()
    ctime = models.DateTimeField(auto_now_add=True)

    objects = OCMShareManager()

    class Meta:
        db_table = 'ocm_share'

    def to_dict(self):
        return {
            'shared_secret': self.shared_secret,
            'from_user': self.from_user,
            'to_user': self.to_user,
            'to_sever_url': self.to_server_url,
            'repo_id': self.repo_id,
            'repo_name': self.repo_name,
            'path': self.path,
            'permission': self.permission,
            'token': self.token,
            'ctime': datetime_to_isoformat_timestr(self.ctime),
        }


class OCMShareReceivedManager(models.Manager):

    def create_ocm_share_received(self, shared_secret, from_user, to_user, from_server_url, repo_id, repo_name, permission, token, provider_id, path='/'):
        ocm_share = super(OCMShareReceivedManager, self).create(shared_secret=shared_secret,
                                                  from_user=from_user,
                                                  to_user=to_user,
                                                  from_server_url=from_server_url,
                                                  repo_id=repo_id,
                                                  repo_name=repo_name,
                                                  path=path,
                                                  permission=permission,
                                                  provider_id=provider_id,
                                                  token=token)
        return ocm_share


class OCMShareReceived(models.Model):
    shared_secret = models.CharField(max_length=36, db_index=True, unique=True)
    from_user = models.CharField(max_length=255, db_index=True)
    to_user = models.CharField(max_length=255, db_index=True)
    from_server_url = models.URLField(db_index=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    repo_name = models.CharField(max_length=settings.MAX_FILE_NAME)
    permission = models.CharField(max_length=50, choices=PERMISSION_CHOICES)
    token = models.CharField(max_length=40, db_index=True)
    path = models.TextField()
    provider_id = models.CharField(max_length=40, db_index=True)
    ctime = models.DateTimeField(auto_now_add=True)

    objects = OCMShareReceivedManager()

    class Meta:
        db_table = 'ocm_share_received'

    def to_dict(self):
        return {
            'shared_secret': self.shared_secret,
            'from_user': self.from_user,
            'to_user': self.to_user,
            'from_server_url': self.from_server_url,
            'repo_id': self.repo_id,
            'repo_name': self.repo_name,
            'path': self.path,
            'permission': self.permission,
            'token': self.token,
            'ctime': datetime_to_isoformat_timestr(self.ctime),
        }
