import logging
import uuid
from django.db import models
from seahub.settings import SERVICE_URL
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname
logger = logging.getLogger(__name__)


class GroupInviteLinkModelManager(models.Manager):
    def create_link(self, group_id, email):
        token = uuid.uuid4().hex[:8]
        while self.model.objects.filter(token=token).exists():
            token = uuid.uuid4().hex[:8]

        group_invite_link = super(GroupInviteLinkModelManager, self).create(
            group_id=group_id, token=token, created_by=email)
        return group_invite_link


class GroupInviteLinkModel(models.Model):
    token = models.CharField(max_length=40, db_index=True)
    group_id = models.IntegerField(db_index=True, null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=255)

    objects = GroupInviteLinkModelManager()

    class Meta:
        db_table = 'group_invite_link'

    def to_dict(self):
        result = {
            'id': self.pk,
            'token': self.token,
            'group_id': self.group_id,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'created_by': email2nickname(self.created_by),
            'link': f"{SERVICE_URL.rstrip('/')}/group-invite/{self.token}/",
        }
        return result