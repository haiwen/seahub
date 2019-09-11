# -*- coding: utf-8 -*-

import os

from django.db import models
from django.db.models import Q

from seahub.tags.models import FileUUIDMap
from seahub.utils import normalize_file_path


class RelatedFilesManager(models.Manager):

    def get_related_files_uuid(self, uuid):

        related_files_uuid = super(RelatedFilesManager, self).filter(
            Q(o_uuid=uuid) | Q(r_uuid=uuid)).select_related('o_uuid', 'r_uuid')

        return related_files_uuid

    def get_related_file_uuid(self, o_repo_id, r_repo_id, o_path, r_path):
        o_file_path = normalize_file_path(o_path)
        o_filename = os.path.basename(o_file_path)
        o_parent_path = os.path.dirname(o_file_path)
        r_file_path = normalize_file_path(r_path)
        r_filename = os.path.basename(r_file_path)
        r_parent_path = os.path.dirname(r_file_path)

        o_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(o_repo_id, o_parent_path, o_filename, is_dir=False)
        r_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(r_repo_id, r_parent_path, r_filename, is_dir=False)
        try:
            return super(RelatedFilesManager, self).get(
                Q(o_uuid=o_uuid, r_uuid=r_uuid) | Q(o_uuid=r_uuid, r_uuid=o_uuid))
        except self.model.DoesNotExist:
            return None

    def add_related_file_uuid(self, o_repo_id, r_repo_id, o_path, r_path):
        o_file_path = normalize_file_path(o_path)
        o_filename = os.path.basename(o_file_path)
        o_parent_path = os.path.dirname(o_file_path)
        r_file_path = normalize_file_path(r_path)
        r_filename = os.path.basename(r_file_path)
        r_parent_path = os.path.dirname(r_file_path)

        o_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(o_repo_id, o_parent_path, o_filename, is_dir=False)
        r_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(r_repo_id, r_parent_path, r_filename, is_dir=False)
        related_file_uuid = self.model(o_uuid=o_uuid, r_uuid=r_uuid)
        related_file_uuid.save()

        return related_file_uuid

    def get_related_file_uuid_by_id(self, related_id):
        try:
            return super(RelatedFilesManager, self).get(pk=related_id)
        except self.model.DoesNotExist:
            return None

    def delete_related_file_uuid(self, related_id):
        try:
            file_related = super(RelatedFilesManager, self).get(pk=related_id)
            file_related.delete()
            return True
        except self.model.DoesNotExist:
            return False


class RelatedFiles(models.Model):

    o_uuid = models.ForeignKey(FileUUIDMap, db_index=True, on_delete=models.CASCADE, related_name='o_uuid')
    r_uuid = models.ForeignKey(FileUUIDMap, db_index=True, on_delete=models.CASCADE, related_name='r_uuid')

    objects = RelatedFilesManager()
