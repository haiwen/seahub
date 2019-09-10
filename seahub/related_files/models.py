# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import os

from django.db import models
from django.db.models import Q
from django.db import connection

from seahub.tags.models import FileUUIDMap
from seahub.utils import normalize_file_path


class RelatedFilesManager(models.Manager):

    def get_related_files(self, uuid):
        cursor = connection.cursor()
        cursor.execute('SELECT `related_files_relatedfiles`.`id`, `related_files_relatedfiles`.`o_uuid`,'
                       '`related_files_relatedfiles`.`r_uuid`, `tags_fileuuidmap`.`repo_id`,'
                       '`tags_fileuuidmap`.`parent_path`, `tags_fileuuidmap`.`filename`, T3.`repo_id`,'
                       'T3.`parent_path`, T3.`filename` FROM `related_files_relatedfiles` INNER JOIN'
                       '`tags_fileuuidmap` ON (`related_files_relatedfiles`.`o_uuid` = `tags_fileuuidmap`.`uuid`)'
                       'INNER JOIN `tags_fileuuidmap` T3 ON (`related_files_relatedfiles`.`r_uuid` = T3.`uuid`)'
                       'WHERE (`related_files_relatedfiles`.`o_uuid` = %s OR'
                       '`related_files_relatedfiles`.`r_uuid` = %s)', (uuid, uuid))
        related_files = cursor.fetchall()

        return related_files

    def get_related_file_uuid(self, o_repo_id, r_repo_id, o_path, r_path):
        o_file_path = normalize_file_path(o_path)
        o_filename = os.path.basename(o_file_path)
        o_parent_path = os.path.dirname(o_file_path)
        r_file_path = normalize_file_path(r_path)
        r_filename = os.path.basename(r_file_path)
        r_parent_path = os.path.dirname(r_file_path)

        o_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(o_repo_id, o_parent_path, o_filename, is_dir=False)
        o_uuid = str(o_uuid.uuid).replace('-', '')
        r_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(r_repo_id, r_parent_path, r_filename, is_dir=False)
        r_uuid = str(r_uuid.uuid).replace('-', '')
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
        o_uuid = str(o_uuid.uuid).replace('-', '')
        r_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(r_repo_id, r_parent_path, r_filename, is_dir=False)
        r_uuid = str(r_uuid.uuid).replace('-', '')
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

    o_uuid = models.CharField(max_length=32, db_index=True)
    r_uuid = models.CharField(max_length=32, db_index=True)

    objects = RelatedFilesManager()
