# Copyright (c) 2012-2019 Seafile Ltd.
import logging

from django.db import models
from seahub.tags.models import FileUUIDMap
from seahub.base.fields import LowerCaseCharField

# Get an instance of a logger
logger = logging.getLogger(__name__)


class FileParticipantManager(models.Manager):

    def get_participants(self, uuid):
        objs = self.filter(uuid=uuid)

        return objs

    def get_participant(self, uuid, username):
        if self.filter(uuid=uuid, username=username).exists():
            return self.filter(uuid=uuid, username=username)[0]

        return None

    def add_participant(self, uuid, username):
        obj = self.model(uuid=uuid, username=username)
        obj.save(using=self._db)

        return obj

    def delete_participant(self, uuid, username):
        self.filter(uuid=uuid, username=username).delete()


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
