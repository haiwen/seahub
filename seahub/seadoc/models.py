import os
import posixpath

from django.db import models

from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname


class SeadocHistoryNameManager(models.Manager):
    def update_name(self, doc_uuid, obj_id, name):
        if self.filter(doc_uuid=doc_uuid, obj_id=obj_id).exists():
            obj = self.filter(doc_uuid=doc_uuid, obj_id=obj_id).update(name=name)
        else:
            obj = self.create(doc_uuid=doc_uuid, obj_id=obj_id, name=name)
        return obj

    def list_by_obj_ids(self, doc_uuid, obj_id_list):
        return self.filter(doc_uuid=doc_uuid, obj_id__in=obj_id_list)


class SeadocHistoryName(models.Model):
    doc_uuid = models.CharField(max_length=36, db_index=True)
    obj_id = models.CharField(max_length=40)
    name = models.CharField(max_length=255)

    objects = SeadocHistoryNameManager()

    class Meta:
        db_table = 'history_name'
        unique_together = ('doc_uuid', 'obj_id')

    def to_dict(self):
        return {
            'doc_uuid': self.doc_uuid,
            'obj_id': self.obj_id,
            'name': self.name,
        }


class SeadocDraftManager(models.Manager):

    def get_by_doc_uuid(self, doc_uuid):
        return self.filter(doc_uuid=doc_uuid).first()

    def mask_as_draft(self, doc_uuid, repo_id, username):
        return self.create(
            doc_uuid=doc_uuid, repo_id=repo_id, username=username)

    def unmask_as_draft(self, doc_uuid):
        return self.filter(doc_uuid=doc_uuid).delete()

    def list_by_doc_uuids(self, doc_uuid_list):
        return self.filter(doc_uuid__in=doc_uuid_list)

    def list_by_username(self, username, start, limit):
        return self.filter(username=username).order_by('-id')[start:limit]

    def list_by_repo_id(self, repo_id, start, limit):
        return self.filter(repo_id=repo_id).order_by('-id')[start:limit]


class SeadocDraft(models.Model):
    doc_uuid = models.CharField(max_length=36, unique=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    username = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = SeadocDraftManager()

    class Meta:
        db_table = 'sdoc_draft'

    def to_dict(self):
        return {
            'doc_uuid': self.doc_uuid,
            'repo_id': self.repo_id,
            'username': self.username,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
        }

class SeadocRevisionManager(models.Manager):

    def add(self, doc_uuid, origin_doc_uuid, repo_id, origin_doc_path, username, origin_file_version):
        last_revision = self.filter(repo_id=repo_id).order_by('revision_id').last()
        if not last_revision:
            revision_id = 1
        else:
            revision_id = last_revision.revision_id + 1
        return self.create(
                doc_uuid=doc_uuid,
                origin_doc_uuid=origin_doc_uuid,
                repo_id=repo_id,
                revision_id=revision_id,
                origin_doc_path=origin_doc_path,
                username=username,
                origin_file_version=origin_file_version,
            )

    def get_by_revision_id(self, repo_id, revision_id):
        return self.filter(repo_id=repo_id, revision_id=revision_id).first()

    def get_by_doc_uuid(self, doc_uuid):
        return self.filter(doc_uuid=doc_uuid).first()

    def list_by_doc_uuids(self, doc_uuid_list):
        return self.filter(doc_uuid__in=doc_uuid_list)

    def list_by_origin_doc_uuid(self, origin_doc_uuid, start, limit):
        return self.filter(
            origin_doc_uuid=origin_doc_uuid, is_published=False).order_by('-id')[start:limit]

    def list_by_username(self, username, start, limit):
        return self.filter(
            username=username, is_published=False).order_by('-id')[start:limit]

    def list_by_repo_id(self, repo_id, start, limit):
        return self.filter(
            repo_id=repo_id, is_published=False).order_by('-id')[start:limit]

    def publish(self, doc_uuid, publisher, publish_file_version):
        return self.filter(doc_uuid=doc_uuid).update(
            publisher=publisher,
            publish_file_version=publish_file_version,
            is_published=True,
        )


class SeadocRevision(models.Model):
    """
    """
    doc_uuid = models.CharField(max_length=36, unique=True)
    origin_doc_uuid = models.CharField(max_length=36, db_index=True)
    repo_id = models.CharField(max_length=36, db_index=True)
    revision_id = models.IntegerField()  # revision_id in repo
    origin_doc_path = models.TextField()  # used when origin file deleted
    username = models.CharField(max_length=255, db_index=True)
    origin_file_version = models.CharField(max_length=100)
    publish_file_version = models.CharField(max_length=100, null=True)
    publisher = models.CharField(max_length=255, null=True)
    is_published = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = SeadocRevisionManager()

    class Meta:
        db_table = 'sdoc_revision'
        unique_together = ('repo_id', 'revision_id')

    def to_dict(self, fileuuidmap_queryset=None):
        from seahub.tags.models import FileUUIDMap
        if fileuuidmap_queryset:
            origin_doc_uuid = fileuuidmap_queryset.filter(uuid=self.origin_doc_uuid).first()
        else:
            origin_doc_uuid = FileUUIDMap.objects.get_fileuuidmap_by_uuid(self.origin_doc_uuid)
        if origin_doc_uuid:
            origin_parent_path = origin_doc_uuid.parent_path
            origin_filename = origin_doc_uuid.filename
        else:
            origin_parent_path = os.path.dirname(self.origin_doc_path)
            origin_filename = os.path.basename(self.origin_doc_path)
        origin_file_path = posixpath.join(origin_parent_path, origin_filename)

        if fileuuidmap_queryset:
            doc_uuid = fileuuidmap_queryset.filter(uuid=self.doc_uuid).first()
        else:
            doc_uuid = FileUUIDMap.objects.get_fileuuidmap_by_uuid(self.doc_uuid)
        if doc_uuid:
            parent_path = doc_uuid.parent_path
            filename = doc_uuid.filename
        else:
            parent_path = '/Revisions'
            filename = self.doc_uuid + '.sdoc'
        file_path = posixpath.join(parent_path, filename)

        return {
            'username': self.username,
            'nickname': email2nickname(self.username),
            'repo_id': self.repo_id,
            'revision_id': self.revision_id,
            'doc_uuid': self.doc_uuid,
            'parent_path': parent_path,
            'filename': filename,
            'file_path': file_path,
            'origin_doc_uuid': self.origin_doc_uuid,
            'origin_parent_path': origin_parent_path,
            'origin_filename': origin_filename,
            'origin_file_path': origin_file_path,
            'origin_file_version': self.origin_file_version,
            'publish_file_version': self.publish_file_version,
            'publisher': self.publisher,
            'publisher_nickname': email2nickname(self.publisher),
            'is_published': self.is_published,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'updated_at': datetime_to_isoformat_timestr(self.updated_at),
        }
