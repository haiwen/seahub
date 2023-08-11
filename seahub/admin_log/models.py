# Copyright (c) 2012-2017 Seafile Ltd.
import json
import datetime
import logging

from django.db import models
from django.dispatch import receiver

from seahub.admin_log.signals import admin_operation

logger = logging.getLogger('admin_operation')

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

    # custom for pingan
    from seahub.utils.timeutils import datetime_to_isoformat_timestr
    from seahub.base.templatetags.seahub_tags import email2nickname
    isoformat_timestr = datetime_to_isoformat_timestr(datetime.datetime.now())
    operation_text = {
        'repo_create': '创建资料库',
        'repo_delete': '删除资料库',
        'repo_transfer': '转让资料库',
        'group_create': '创建群组',
        'group_delete': '删除群组',
        'group_transfer': '转让群组',
        'user_add': '添加用户',
        'user_delete': '删除用户',
    }
    def get_detail_text(operation, detail):
        if operation == 'repo_create':
            return '创建资料库 %s 并把资料库拥有者设为 %s' % (detail.get('name', ''), detail.get('owner', ''))
        if operation == 'repo_delete':
            return '删除资料库 %s' % detail.get('name', '')
        if operation == 'repo_transfer':
            return '已把资料库 %s 从 %s 转让给 %s' % (detail.get('name', ''), detail.get('from', ''), detail.get('to', ''))
        if operation == 'group_create':
            return '已创建群组 %s' % detail.get('name', '')
        if operation == 'group_delete':
            return '已删除群组 %s' % detail.get('name', '')
        if operation == 'group_transfer':
            return '已把群组 %s 从 %s 转让给 %s' % (detail.get('name', ''), detail.get('from', ''), detail.get('to', ''))
        if operation == 'user_add':
            return '已添加用户 %s' % detail.get('email', '')
        if operation == 'user_delete':
            return '已删除用户 %s' % detail.get('email', '')
        return '未知操作'

    log_info = {
        "管理员邮箱": admin_name,
        "管理员名字": email2nickname(admin_name),
        "操作类型": operation_text.get(operation, '未知操作'),
        "详情": get_detail_text(operation, detail),
        "时间": isoformat_timestr,
    }
    logger.info(log_info)
