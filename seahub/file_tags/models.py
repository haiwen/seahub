# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import os
import hashlib
from django.db import models
from django.db import connection

from seahub.repo_tags.models import RepoTags
from seahub.tags.models import FileUUIDMap
from seahub.utils import normalize_file_path


class FileTagsManager(models.Manager):

    def get_file_tag_by_path(self, repo_id, file_path):
        file_path = normalize_file_path(file_path)
        filename = os.path.basename(file_path)
        parent_path = os.path.dirname(file_path)

        file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, parent_path, filename, is_dir=False)
        file_uuid = str(file_uuid.uuid).replace('-', '')

        cursor = connection.cursor()
        cursor.execute('SELECT `file_tags_filetags`.`id`, `file_tags_filetags`.`repo_tag_id`,'
                       '`repo_tags_repotags`.`name`, `repo_tags_repotags`.`color` FROM `file_tags_filetags`INNER JOIN'
                       '`repo_tags_repotags` ON (`file_tags_filetags`.`repo_tag_id` = `repo_tags_repotags`.`id`) WHERE'
                       '`file_tags_filetags`.`file_uuid` = %s', (file_uuid, ))
        query_set = cursor.fetchall()

        file_tags = list()
        for query in query_set:
            tag_dict = dict()
            tag_dict['file_tag_id'] = query[0]
            tag_dict['repo_tag_id'] = query[1]
            tag_dict['tag_name'] = query[2]
            tag_dict['tag_color'] = query[3]
            file_tags.append(tag_dict)

        return file_tags

    def get_file_tag_by_id(self, file_tag_id):
        try:
            return super(FileTagsManager, self).get(pk=file_tag_id)
        except self.model.DoesNotExist:
            return None

    def get_file_tag(self, repo_id, repo_tag_id, file_path):
        file_path = normalize_file_path(file_path)
        filename = os.path.basename(file_path)
        parent_path = os.path.dirname(file_path)

        file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, parent_path, filename, is_dir=False)
        file_uuid = str(file_uuid.uuid).replace('-', '')
        try:
            return super(FileTagsManager, self).get(repo_tag_id=repo_tag_id, file_uuid=file_uuid)
        except self.model.DoesNotExist:
            return None

    def add_file_tag(self, repo_id, repo_tag_id, file_path):
        file_path = normalize_file_path(file_path)
        filename = os.path.basename(file_path)
        parent_path = os.path.dirname(file_path)
        file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, parent_path, filename, is_dir=False)
        file_uuid = str(file_uuid.uuid).replace('-', '')
        repo_tag = RepoTags.objects.get_repo_tag_by_id(repo_tag_id)
        file_tag = self.model(repo_tag=repo_tag, file_uuid=file_uuid)
        file_tag.save()
        return file_tag

    def delete_file_tag(self, file_tag_id):
        try:
            file_tag = super(FileTagsManager, self).get(pk=file_tag_id)
            file_tag.delete()
            return True
        except self.model.DoesNotExist:
            return False

    def get_dir_file_tags(self, repo_id, path):
        parent_path = os.path.dirname(path)
        repo_id_parent_path_md5 = hashlib.md5((repo_id + parent_path).encode('utf-8')).hexdigest()
        cursor = connection.cursor()
        cursor.execute('SELECT `file_tags_filetags`.`id`, `file_tags_filetags`.`repo_tag_id`,'
                       '`repo_tags_repotags`.`name`, `repo_tags_repotags`.`color`,`tags_fileuuidmap`.`filename` '
                       'FROM `file_tags_filetags` INNER JOIN `tags_fileuuidmap` ON'
                       '(`file_tags_filetags`.`file_uuid` = `tags_fileuuidmap`.`uuid`) INNER JOIN'
                       '`repo_tags_repotags` ON (`file_tags_filetags`.`repo_tag_id` = `repo_tags_repotags`.`id`) WHERE'
                       '`tags_fileuuidmap`.`repo_id_parent_path_md5` = %s', (repo_id_parent_path_md5, ))
        files_tags = cursor.fetchall()
        return files_tags


class FileTags(models.Model):

    repo_tag = models.ForeignKey(RepoTags, db_index=True, on_delete=models.CASCADE)
    file_uuid = models.CharField(max_length=32, db_index=True)

    objects = FileTagsManager()

    def to_dict(self):

        return {
            "file_tag_id": self.pk,
            "repo_tag_id": self.repo_tag_id,
        }
