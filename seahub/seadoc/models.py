from django.db import models

from seahub.utils.timeutils import datetime_to_isoformat_timestr


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
            'id': self.pk,
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

    def list_by_username(self, username):
        return self.filter(username=username)

    def list_by_repo_id(self, repo_id):
        return self.filter(repo_id=repo_id)


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
