# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import os
import uuid
import hashlib
import posixpath

from django.db import models

from seaserv import seafile_api

from seahub.base.fields import LowerCaseCharField
from seahub.utils import normalize_file_path, normalize_dir_path


########## Manager
class FileUUIDMapManager(models.Manager):

    def get_fileuuidmap_by_uuid(self, uuid):
        try:
            return super(FileUUIDMapManager, self).get(uuid=uuid)
        except self.model.DoesNotExist:
            return None

    def get_or_create_fileuuidmap(self, repo_id, parent_path, filename, is_dir):
        """ create filemap by repo_id、 parent_path、filename、id_dir
            args:
            - `repo_id`:
            - `parent_path`:
            - `filename`: input a dirname  if it's dir
            - `id_dir`: input True or False
            return:
                uuid of filemap
        """
        repo_id, parent_path = self.model.get_origin_repo_id_and_parent_path(repo_id, parent_path)
        uuid = self.get_fileuuidmap_by_path(repo_id, parent_path, filename, is_dir)
        if not uuid:
            uuid = self.model(repo_id=repo_id, parent_path=parent_path,
                              filename=filename, is_dir=is_dir)
            uuid.save(using=self._db)
        return uuid

    def get_fileuuidmap_by_path(self, repo_id, parent_path, filename, is_dir):
        """ get filemap uuid by repoid、 parent_path 、 filename 、is_dir
            args:
            - `repo_id`:
            - `parent_path`:
            - `filename`: input a dirname  if it's dir
            - `id_dir`: input True or False
            return:
                return uuid if it's exist,otherwise return None
        """
        repo_id, parent_path = self.model.get_origin_repo_id_and_parent_path(repo_id, parent_path)
        md5_repo_id_parent_path = self.model.md5_repo_id_parent_path(repo_id, parent_path)
        uuid = super(FileUUIDMapManager, self).filter(
            repo_id_parent_path_md5=md5_repo_id_parent_path,
            filename=filename, is_dir=is_dir
        )
        if len(uuid) > 0:
            return uuid[0]
        else:
            return None

    def get_fileuuidmaps_by_parent_path(self, repo_id, parent_path):
        repo_id, parent_path = self.model.get_origin_repo_id_and_parent_path(repo_id, parent_path)
        parent_path = FileUUIDMap.normalize_path(parent_path)
        uuids = super(FileUUIDMapManager, self).filter(
            repo_id=repo_id, parent_path=parent_path
        )
        return uuids

    def get_or_create_fileuuidmap_by_path(self, repo_id, path, is_dir):
        if is_dir:
            path = normalize_dir_path(path)
        else:
            path = normalize_file_path(path)

        path = path.rstrip('/')

        parent_path = os.path.dirname(path)
        obj_name = os.path.basename(path)

        return self.get_or_create_fileuuidmap(repo_id, parent_path, obj_name, is_dir)

    def delete_fileuuidmap_by_path(self, repo_id, parent_path, filename, is_dir):
        repo_id, parent_path = self.model.get_origin_repo_id_and_parent_path(repo_id, parent_path)
        md5_repo_id_parent_path = self.model.md5_repo_id_parent_path(repo_id, parent_path)
        super(FileUUIDMapManager, self).filter(
            repo_id_parent_path_md5=md5_repo_id_parent_path,
            filename=filename, is_dir=is_dir
        ).delete()


class TagsManager(models.Manager):
    def get_or_create_tag(self, tagname):
        try:
            return super(TagsManager, self).get(name=tagname)
        except self.model.DoesNotExist:
            tag = self.model(name=tagname)
            tag.save()
            return tag


class FileTagManager(models.Manager):
    def get_or_create_file_tag(self, repo_id, parent_path, filename, is_dir, tagname, creator):
        """ Create filetag if tag does not exist, otherwise directly to True
            Must always pass origin_repo_id and origin_path

            args:
            - `uuid`: uuid of filemap
            - `tagname`:
            - `creator`:

            return:
                (tag_obj, is_created)
        """
        fileuuidmap = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, parent_path, filename, is_dir)
        tag = self.exists_filetag(fileuuidmap.uuid, tagname)
        if tag[1]:
            return (tag[0], False)
        else:
            tag = self.model(
                uuid=FileUUIDMap.objects.get_fileuuidmap_by_uuid(fileuuidmap.uuid),
                tag=Tags.objects.get_or_create_tag(tagname),
                username=creator
            )
            tag.save()
            return (tag, True)

    def exists_filetag(self, uuid_id, tagname):
        """ To determine whether the filetag exists.
            args:
            - `uuid`:uuid of filemap
            - `tagname`: tag name
            return:
                (tag_obj, is_exist)
        """
        tag = super(FileTagManager, self).filter(uuid=uuid_id, tag__name=tagname)
        if len(tag) > 0:
            return (tag[0], True)
        else:
            return (None, False)

    def get_all_file_tag_by_path(self, repo_id, parent_path, filename, is_dir):
        """
            args:
            - `repo_id`:
            - `parent_path`:
            - `filename`: file name or dir name
            - `is_dir`: True or False
            return list of filetag
        """
        uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(repo_id, parent_path, 
                                                           filename, is_dir)
        return super(FileTagManager, self).filter(
            uuid=uuid
        )

    def delete_file_tag_by_path(self, repo_id, parent_path, filename, is_dir, tagname):
        """ delete one specific filetag
            args:
            - `uuid_id`:id of  uuid in filemap
            - `tagname`:
            return:
                always return True
        """
        uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(repo_id, parent_path, 
                                                           filename, is_dir)
        filetag = super(FileTagManager, self).filter(
            uuid=uuid,
            tag__name=tagname
        )
        if len(filetag) > 0:
            filetag.delete()
            return True
        else:
            return False

    def delete_all_filetag_by_path(self, repo_id, parent_path, filename, is_dir):
        """ delete all filetag
            args:
            - `repo_id`: 
            - `parent_path`
            - `filename`
            - `is_dir`
            return:
                always return True
        """
        uuid = FileUUIDMap.objects.get_fileuuidmap_by_path(repo_id, parent_path, 
                                                           filename, is_dir)
        super(FileTagManager, self).filter(uuid=uuid).delete()


########## Model
class FileUUIDMap(models.Model):
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4)
    repo_id = models.CharField(max_length=36, db_index=True)
    repo_id_parent_path_md5 = models.CharField(max_length=100, db_index=True)
    parent_path = models.TextField()
    filename = models.CharField(max_length=1024)
    is_dir = models.BooleanField()
    objects = FileUUIDMapManager()

    @classmethod
    def md5_repo_id_parent_path(cls, repo_id, parent_path):
        parent_path = parent_path.rstrip('/') if parent_path != '/' else '/'
        return hashlib.md5((repo_id + parent_path).encode('utf-8')).hexdigest()

    @classmethod
    def normalize_path(self, path):
        return path.rstrip('/') if path != '/' else '/'

    @classmethod
    def get_origin_repo_id_and_parent_path(cls, repo_id, parent_path):
        repo = seafile_api.get_repo(repo_id)
        if repo.is_virtual:
            repo_id = repo.origin_repo_id
            parent_path = posixpath.join(repo.origin_path, parent_path.strip('/'))
        return repo_id, parent_path

    def save(self, *args, **kwargs):
        self.parent_path = self.normalize_path(self.parent_path)
        if not self.repo_id_parent_path_md5:
            self.repo_id_parent_path_md5 = self.md5_repo_id_parent_path(
                self.repo_id, self.parent_path)

        super(FileUUIDMap, self).save(*args, **kwargs)


class Tags(models.Model):
    name = models.CharField(max_length=255, unique=True)

    objects = TagsManager()


class FileTag(models.Model):
    uuid = models.ForeignKey(FileUUIDMap, on_delete=models.CASCADE)
    tag = models.ForeignKey(Tags, on_delete=models.CASCADE)
    username = LowerCaseCharField(max_length=255)

    objects = FileTagManager()

    def to_dict(self):
        return {'id': self.tag.id, 'name': self.tag.name, 'creator': self.username}
