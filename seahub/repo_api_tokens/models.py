from hashlib import sha1

import hmac
import uuid
from django.db import models

from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE


class RepoAPITokensManager(models.Manager):

    @staticmethod
    def generate_key():
        unique = str(uuid.uuid4())
        return hmac.new(unique.encode('utf-8'), digestmod=sha1).hexdigest()

    def create_token(self, app_name, repo_id, username, permission=PERMISSION_READ):
        token = self.generate_key()
        rat = super(RepoAPITokensManager, self).create(app_name=app_name,
                                                       repo_id=repo_id,
                                                       generated_by=username,
                                                       permission=permission,
                                                       token=token)
        return rat


class RepoAPITokens(models.Model):

    PERMISSION_CHOICES = (
        (PERMISSION_READ, 'read'),
        (PERMISSION_READ_WRITE, 'read and write')
    )

    repo_id = models.CharField(max_length=36, db_index=True)
    app_name = models.CharField(max_length=255, db_index=True)
    token = models.CharField(unique=True, max_length=40)
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.CharField(max_length=255)
    last_access = models.DateTimeField(auto_now=True)
    permission = models.CharField(max_length=15)

    objects = RepoAPITokensManager()

    class Meta:
        db_table = 'repo_api_tokens'
