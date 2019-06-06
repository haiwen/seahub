# Copyright (c) 2012-2019 Seafile Ltd.
import os

import logging
from django.db import models
from seahub.tags.models import FileUUIDMap
from seahub.base.fields import LowerCaseCharField

# Get an instance of a logger
logger = logging.getLogger(__name__)


class FileParticipantManager(models.Manager):

    def _get_file_uuid_map(self, repo_id, file_path):
        parent_path = os.path.dirname(file_path)
        item_name = os.path.basename(file_path)

        file_uuid_map = FileUUIDMap.objects.get_or_create_fileuuidmap(
            repo_id, parent_path, item_name, False)

        return file_uuid_map

    def add_by_file_path_and_username(self, repo_id, file_path, username):
        uuid = self._get_file_uuid_map(repo_id, file_path)
        if self.filter(uuid=uuid, username=username).exists():
            return self.filter(uuid=uuid, username=username)[0]

        obj = self.model(uuid=uuid, username=username)
        obj.save(using=self._db)

        return obj

    def get_by_file_path_and_username(self, repo_id, file_path, username):
        uuid = self._get_file_uuid_map(repo_id, file_path)
        try:
            obj = self.get(uuid=uuid, username=username)
            return obj
        except self.model.DoesNotExist:
            return None

    def delete_by_file_path_and_username(self, repo_id, file_path, username):
        uuid = self._get_file_uuid_map(repo_id, file_path)
        self.filter(uuid=uuid, username=username).delete()

    def get_by_file_path(self, repo_id, file_path):
        uuid = self._get_file_uuid_map(repo_id, file_path)
        objs = self.filter(uuid=uuid)

        return objs


class FileParticipant(models.Model):
    """
    Model used to record file participants.
    """
    uuid = models.ForeignKey(FileUUIDMap, on_delete=models.CASCADE)
    username = LowerCaseCharField(max_length=255)

    objects = FileParticipantManager()

    class Meta:
        """Meta data"""
        unique_together = ('uuid', 'username')
