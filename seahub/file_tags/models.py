# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import os
from django.db import models
from seahub.repo_tags.models import RepoTags
from seahub.tags.models import FileUUIDMap
from seahub.utils import normalize_file_path


class FileTagsManager(models.Manager):

    def get_file_tag_by_path(self, repo_id, file_path):
        file_path = normalize_file_path(file_path)
        filename = os.path.basename(file_path)
        parent_path = os.path.dirname(file_path)
        folder_name = os.path.dirname(parent_path)

        file_uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(
            repo_id, parent_path, filename, is_dir=False)
        parent_folder_uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(
            repo_id, parent_path, folder_name, is_dir=True)

        file_tag_list = super(FileTagsManager, self).filter(
            file_uuid=file_uuid, parent_folder_uuid=parent_folder_uuid).select_related('repo_tag')

        file_tags = list()
        for file_tag in file_tag_list:
            tag_dict = dict()
            tag_dict['file_tag_id'] = file_tag.pk
            tag_dict['repo_tag_id'] = file_tag.repo_tag.pk
            tag_dict['tag_name'] = file_tag.repo_tag.name
            tag_dict['tag_color'] = file_tag.repo_tag.color
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
        folder_name = os.path.dirname(parent_path)

        file_uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(
            repo_id, parent_path, filename, is_dir=False)
        parent_folder_uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(
            repo_id, parent_path, folder_name, is_dir=True)
        try:
            return super(FileTagsManager, self).get(repo_tag_id=repo_tag_id,
                                                    file_uuid=file_uuid,
                                                    parent_folder_uuid=parent_folder_uuid)
        except self.model.DoesNotExist:
            return None

    def add_file_tag(self, repo_id, repo_tag_id, file_path):
        file_path = normalize_file_path(file_path)
        filename = os.path.basename(file_path)
        parent_path = os.path.dirname(file_path)
        folder_name = os.path.dirname(parent_path)
        file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(
            repo_id, parent_path, filename, is_dir=False)
        parent_folder_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(
            repo_id, parent_path, folder_name, is_dir=True)
        repo_tag = RepoTags.objects.get_repo_tag_by_id(repo_tag_id)
        file_tag = self.model(repo_tag=repo_tag,
                              file_uuid=file_uuid,
                              parent_folder_uuid=parent_folder_uuid)
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
        folder_name = os.path.dirname(parent_path)
        parent_folder_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(
            repo_id, parent_path, folder_name, is_dir=True)

        return super(FileTagsManager, self).filter(parent_folder_uuid=parent_folder_uuid)


class FileTags(models.Model):

    repo_tag = models.ForeignKey(RepoTags, db_index=True, on_delete=models.CASCADE)
    file_uuid = models.ForeignKey(FileUUIDMap, on_delete=models.CASCADE, related_name='file_uuid')
    parent_folder_uuid = models.ForeignKey(FileUUIDMap, on_delete=models.CASCADE, related_name='parent_folder_uuid')

    objects = FileTagsManager()

    def to_dict(self):

        return {
            "file_tag_id": self.pk,
            "repo_tag_id": self.repo_tag_id,
        }
