from django.db import models


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
