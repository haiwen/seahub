import os
import json
import posixpath

from django.db import models

from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.seadoc.settings import SDOC_REVISIONS_DIR

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
    doc_uuid = models.CharField(max_length=36)
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

    def list_by_username(self, username, start, end):
        return self.filter(username=username).order_by('-id')[start:end]

    def list_by_repo_id(self, repo_id, start, end):
        return self.filter(repo_id=repo_id).order_by('-id')[start:end]


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

    def get_by_origin_doc_uuid_and_revision_id(self, origin_doc_uuid, revision_id):
        return self.filter(origin_doc_uuid=origin_doc_uuid, revision_id=revision_id).first()
    
    def list_by_doc_uuids(self, doc_uuid_list):
        return self.filter(doc_uuid__in=doc_uuid_list)

    def list_by_origin_doc_uuid(self, origin_doc_uuid, start, end):
        return self.filter(
            origin_doc_uuid=origin_doc_uuid, is_published=False).order_by('-id')[start:end]
    
    def list_all_by_origin_doc_uuid(self, origin_doc_uuid):
        return self.filter(
            origin_doc_uuid=origin_doc_uuid, is_published=False).order_by('revision_id')

    def list_by_username(self, username, start, end):
        return self.filter(
            username=username, is_published=False).order_by('-id')[start:end]

    def list_by_repo_id(self, repo_id, start, end):
        return self.filter(
            repo_id=repo_id, is_published=False).order_by('-id')[start:end]

    def publish(self, doc_uuid, publisher, publish_file_version):
        return self.filter(doc_uuid=doc_uuid).update(
            publisher=publisher,
            publish_file_version=publish_file_version,
            is_published=True,
        )
    
    def delete_by_doc_uuid(self, doc_uuid):
        self.filter(doc_uuid=doc_uuid).delete()

    def update_origin_file_version(self, doc_uuid, origin_file_version):
        return self.filter(doc_uuid=doc_uuid).update(origin_file_version=origin_file_version)


class SeadocRevision(models.Model):
    """
    """
    doc_uuid = models.CharField(max_length=36, unique=True)
    origin_doc_uuid = models.CharField(max_length=36, db_index=True)
    repo_id = models.CharField(max_length=36)
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
            parent_path = SDOC_REVISIONS_DIR
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


class SeadocCommentReplyManager(models.Manager):
    def list_by_comment_id(self, comment_id):
        return self.filter(comment_id=comment_id)

    def list_by_doc_uuid(self, doc_uuid):
        return self.filter(doc_uuid=doc_uuid)


class SeadocCommentReply(models.Model):
    author = models.CharField(max_length=255)
    reply = models.TextField()
    type = models.CharField(max_length=36)
    comment_id = models.IntegerField(db_index=True)
    doc_uuid = models.CharField(max_length=36, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = SeadocCommentReplyManager()

    class Meta:
        db_table = 'sdoc_comment_reply'

    def to_dict(self):
        return {
            'id': self.pk,
            'author': self.author,
            'reply': self.reply,
            'type': self.type,
            'comment_id': self.comment_id,
            'doc_uuid': self.doc_uuid,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'updated_at': datetime_to_isoformat_timestr(self.updated_at),
        }



### sdoc notification
MSG_TYPE_REPLY = 'reply'
MSG_TYPE_COMMENT = 'comment'

class SeadocNotificationManager(models.Manager):
    def total_count(self, doc_uuid, username):
        return self.filter(doc_uuid=doc_uuid, username=username).count()

    def list_by_user(self, doc_uuid, username, start, end):
        return self.filter(doc_uuid=doc_uuid, username=username).order_by('-created_at')[start: end]

    def list_by_unseen(self, doc_uuid, username):
        return self.filter(doc_uuid=doc_uuid, username=username, seen=False)
    
    def delete_by_ids(self, doc_uuid, username, ids):
        return self.filter(doc_uuid=doc_uuid, username=username, id__in=ids).delete()
    
    def list_all_by_user(self, username):
        return self.filter(username=username).order_by('-created_at')
    
    def remove_user_notifications(self, username):
        """"Remove all user notifications."""
        self.filter(username=username).delete()


class SeadocNotification(models.Model):
    doc_uuid = models.CharField(max_length=36)
    username = models.CharField(max_length=255)
    msg_type = models.CharField(max_length=36)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    detail = models.TextField()
    seen = models.BooleanField(default=False)

    objects = SeadocNotificationManager()

    class Meta:
        db_table = 'sdoc_notification'
        unique_together = ('doc_uuid', 'username')

    def to_dict(self):
        return {
            'id': self.pk,
            'doc_uuid': self.doc_uuid,
            'username': self.username,
            'msg_type': self.msg_type,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'detail': json.loads(self.detail),
            'seen': self.seen,
        }

    def is_comment(self):
        return self.msg_type == MSG_TYPE_COMMENT

    def is_reply(self):
        return self.msg_type == MSG_TYPE_REPLY
