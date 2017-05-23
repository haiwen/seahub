# Copyright (c) 2012-2017 Seafile Ltd.
import json
import datetime

from django.db import models
from django.dispatch import receiver

from seahub.admin_log.signals import admin_operation

## operation: detail

# 'repo_create': {'id': repo_id, 'name': repo_name, 'owner': repo_owner}
REPO_CREATE = 'repo_create'
# 'repo_transfer': {'id': repo_id, 'name': repo_name, 'from': from_user, 'to': to_user}
REPO_TRANSFER = 'repo_transfer'
# 'repo_delete': {'id': repo_id, 'name': repo_name, 'owner': repo_owner}
REPO_DELETE = 'repo_delete'

# 'group_create': {'id': group_id, 'name': group_name, 'owner': group_owner}
GROUP_CREATE = 'group_create'
# 'group_transfer': {'id': group_id, 'name': group_name, 'from': from_user, 'to': to_user}
GROUP_TRANSFER = 'group_transfer'
# 'group_delete': {'id': group_id, 'name': group_name, 'owner': group_owner}
GROUP_DELETE = 'group_delete'

# 'user_add': {'email': new_user}
USER_ADD = 'user_add'
# 'user_delete': {'email': deleted_user}
USER_DELETE = 'user_delete'

ADMIN_LOG_OPERATION_TYPE = (REPO_TRANSFER, REPO_DELETE,
        GROUP_CREATE, GROUP_TRANSFER, GROUP_DELETE,
        USER_ADD, USER_DELETE)


class AdminLogManager(models.Manager):

    def add_admin_log(self, email, operation, detail):

        model= super(AdminLogManager, self).create(
            email=email, operation=operation, detail=detail)

        model.save()

        return model

    def get_admin_logs(self, email=None, operation=None):

        logs = super(AdminLogManager, self).all()

        if email:
            logs = logs.filter(email=email)

        if operation:
            logs = logs.filter(operation=operation)

        return logs

class AdminLog(models.Model):
    email = models.EmailField(db_index=True)
    operation = models.CharField(max_length=255, db_index=True)
    detail = models.TextField()
    datetime = models.DateTimeField(default=datetime.datetime.now)
    objects = AdminLogManager()

    class Meta:
        ordering = ["-datetime"]


###### signal handlers
@receiver(admin_operation)
def admin_operation_cb(sender, **kwargs):
    admin_name = kwargs['admin_name']
    operation = kwargs['operation']
    detail = kwargs['detail']

    detail_json = json.dumps(detail)
    AdminLog.objects.add_admin_log(admin_name,
            operation, detail_json)
