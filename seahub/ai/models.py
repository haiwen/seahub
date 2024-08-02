# Copyright (c) 2012-2017 Seafile Ltd.
import json
import os

from django.db import models
from seahub.utils.timeutils import datetime_to_isoformat_timestr, timestamp_to_isoformat_timestr
from seaserv import seafile_api


class RepoImageFaceManager(models.Manager):

    def get_faces_by_repo_id(self, repo_id):
        records = self.filter(repo_id=repo_id)
        faces = {}
        for item in records:
            face_id = item.face_id
            file_path = item.path
            file_obj = seafile_api.get_dirent_by_path(repo_id, file_path)
            if not file_obj:
                self.filter(repo_id=repo_id, path=file_path).delete()
                continue
            file_size = file_obj.size
            mtime = file_obj.mtime
            file_item = {
                'path': file_path,
                'file_name': os.path.basename(file_path),
                'parent_dir': os.path.dirname(file_path),
                'size': file_size,
                'mtime': timestamp_to_isoformat_timestr(mtime)
            }
            if face_id not in faces:
                faces[face_id] = [file_item]
            else:
                faces[face_id].append(file_item)

        return faces


class RepoImageFace(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    face_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField()

    objects = RepoImageFaceManager()

    class Meta:
        db_table = 'repo_image_face'

    def to_dict(self):
        return {
            'id': self.pk,
            'assistant_uuid': self.assistant_uuid,
            'owner': self.owner,
            'created_at': datetime_to_isoformat_timestr(self.created_at)
        }
