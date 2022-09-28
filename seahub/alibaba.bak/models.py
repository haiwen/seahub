# encoding: utf-8

# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey has `on_delete` set to the desired behavior.
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from __future__ import unicode_literals

import json
import uuid
import logging

from django.db import models
from django.utils import timezone, translation

logger = logging.getLogger(__name__)

try:
    from seahub.settings import ALIBABA_MESSAGE_TOPIC_PUSH_MESSAGE, \
            ALIBABA_DINGDING_TALK_URL, ALIBABA_MESSAGE_TOPIC_LEAVE_FILE_HANDOVER
except ImportError:
    ALIBABA_MESSAGE_TOPIC_PUSH_MESSAGE = '01_push_message'
    ALIBABA_MESSAGE_TOPIC_LEAVE_FILE_HANDOVER = '02_leave_file_handover'
    ALIBABA_DINGDING_TALK_URL = "dingtalk://dingtalkclient/page/link?url=%s&pc_slide=false"


class AlibabaProfileManager(models.Manager):

    def get_profile_dict(self, email):

        profile_dict = {
            "work_no": '',
            "dept_name": '',
            "post_name": '',
        }

        profile_list = super(AlibabaProfileManager, self).filter(uid=email)
        if not profile_list:
            logger.error('No profile found for user: %s' % email)
            return profile_dict

        for profile in profile_list:

            # at work
            if profile.work_status in ('A', 'a'):

                profile_dict['work_no'] = profile.work_no or ''

                if translation.get_language() in ('zh-cn', 'zh-tw'):
                    profile_dict['dept_name'] = profile.dept_name or ''
                    profile_dict['post_name'] = profile.post_name or ''
                else:
                    profile_dict['dept_name'] = profile.dept_name_en or ''
                    profile_dict['post_name'] = profile.post_name_en or ''

                return profile_dict

        logger.error('User %s is not at work status' % email)
        return profile_dict

    def get_profile(self, email):

        profile_list = super(AlibabaProfileManager, self).filter(uid=email)
        if not profile_list:
            logger.error('No profile found for user: %s' % email)
            return None

        for profile in profile_list:
            # at work
            if profile.work_status in ('A', 'a'):
                return profile

        logger.error('User %s is not at work status' % email)
        return None

    def get_profile_by_work_no(self, work_no, at_work=True):

        profile_list = super(AlibabaProfileManager, self).filter(work_no=work_no)
        if not profile_list:
            return None

        if at_work:
            for profile in profile_list:
                # at work
                if profile.work_status in ('A', 'a'):
                    return profile
        else:
            return profile_list[0]


class AlibabaProfile(models.Model):
    id = models.BigAutoField(primary_key=True)
    uid = models.CharField(max_length=191, unique=True)
    personal_photo_url = models.CharField(max_length=225, blank=True, null=True)
    person_id = models.BigIntegerField(unique=True)
    emp_name = models.CharField(max_length=64, blank=True, null=True)
    pinyin_name = models.CharField(max_length=64, blank=True, null=True)
    nick_name = models.CharField(max_length=64, blank=True, null=True)
    pinyin_nick = models.CharField(max_length=64, blank=True, null=True)
    work_no = models.CharField(max_length=16)
    post_name = models.CharField(max_length=64)
    post_name_en = models.CharField(max_length=64)
    dept_name = models.CharField(max_length=128)
    dept_name_en = models.CharField(max_length=128)
    work_status = models.CharField(max_length=4)
    gmt_leave = models.DateTimeField(blank=True, null=True)

    objects = AlibabaProfileManager()

    class Meta:
        managed = False
        db_table = 'alibaba_profile'


class AlibabaMessageQueueManager(models.Manager):

    def add_dingding_message(self, alibaba_message_topic,
            content_cn, content_en, to_work_no_list):

        message_body = {
            "pushType": "dingding",
            "contentCN": content_cn,
            "contentEN": content_en,
            "pushWorkNos": to_work_no_list
        }

        message_body_json = json.dumps(message_body,
                ensure_ascii=False, encoding='utf8')

        message = self.model(topic=alibaba_message_topic,
                message_body=message_body_json,
                lock_version=0, is_consumed=0,
                message_key=uuid.uuid4())

        message.save(using=self._db)
        return message

    def add_lock(self, message_id):

        try:
            message = self.get(id=message_id)
            message.lock_version = 1
            message.save(using=self._db)
            return message
        except AlibabaMessageQueue.DoesNotExist:
            logger.error('Message %s does not exists' % message_id)

    def remove_lock(self, message_id):

        try:
            message = self.get(id=message_id)
            message.lock_version = 0
            message.save(using=self._db)
            return message
        except AlibabaMessageQueue.DoesNotExist:
            logger.error('Message %s does not exists' % message_id)

    def mark_message_consumed(self, message_id):

        try:
            message = self.get(id=message_id)
            message.is_consumed = 1
            message.save(using=self._db)
            return message
        except AlibabaMessageQueue.DoesNotExist:
            logger.error('Message %s does not exists' % message_id)

    def mark_message_exception(self, message_id):

        try:
            message = self.get(id=message_id)
            message.is_consumed = 99
            message.save(using=self._db)
            return message
        except AlibabaMessageQueue.DoesNotExist:
            logger.error('Message %s does not exists' % message_id)


class AlibabaMessageQueue(models.Model):
    id = models.BigAutoField(primary_key=True)
    topic = models.CharField(max_length=64)
    gmt_create = models.DateTimeField()
    gmt_modified = models.DateTimeField()
    message_body = models.TextField()
    is_consumed = models.IntegerField(blank=True, null=True)
    lock_version = models.IntegerField()
    message_key = models.CharField(max_length=128, blank=True, null=True)

    objects = AlibabaMessageQueueManager()

    class Meta:
        managed = False
        db_table = 'message_queue'


class AlibabaRepoOwnerChainManager(models.Manager):

    def add_repo_create_chain(self, repo_id, operator):

        chain = self.model(repo_id=repo_id,
                operator=operator, from_user=operator,
                to_user=operator)

        chain.save(using=self._db)
        return chain

    def add_repo_transfer_chain(self, repo_id, operator,
            from_user, to_user):

        chain = self.model(repo_id=repo_id, operator=operator,
                from_user=from_user, to_user=to_user,
                operation=AlibabaRepoOwnerChain.OPERATION_TRANSFER)

        chain.save(using=self._db)
        return chain

    def get_repo_owner_chain(self, repo_id):

        return self.filter(repo_id=repo_id).order_by("-timestamp")


class AlibabaRepoOwnerChain(models.Model):

    OPERATION_CREATE = 'create'
    OPERATION_TRANSFER = 'transfer'
    OPERATION_CHOICES = (
        (OPERATION_CREATE, 'Create'),
        (OPERATION_TRANSFER, 'Transer'),
    )

    id = models.BigAutoField(primary_key=True)
    repo_id = models.CharField(max_length=36)
    operator = models.CharField(max_length=191)
    operation = models.CharField(max_length=32,
            choices=OPERATION_CHOICES, default=OPERATION_CREATE)
    from_user = models.CharField(max_length=191)
    to_user = models.CharField(max_length=191)
    timestamp = models.DateTimeField(default=timezone.now)

    objects = AlibabaRepoOwnerChainManager()

    class Meta:
        managed = False
        db_table = 'alibaba_repoownerchain'


class AlibabaUserEditFileManager(models.Manager):

    def add_or_update_start_edit_info(self, user, repo_id, path,
            wopi_oldlock, wopi_lock):

        # OOS will send multi POST request to lock/refresh-lock
        # when user is editing file

        infos = self.filter(user=user, repo_id=repo_id, path=path,
                wopi_lock=wopi_oldlock)
        if len(infos) == 0:
            # if no lock info stored in db, that means file is not locked, add init lock info
            info = self.model(user=user, repo_id=repo_id,
                    path=path, wopi_lock=wopi_lock)
        else:
            # if has lock info stored in db, update lock info
            info = infos[0]
            info.wopi_lock = wopi_lock

        info.save(using=self._db)
        return info

    def complete_end_edit_info(self, user, repo_id, path, wopi_lock):

        infos = self.filter(user=user, repo_id=repo_id, path=path, wopi_lock=wopi_lock)
        for info in infos:
            if not info.end_timestamp:
                info.end_timestamp = timezone.now()
                info.save(using=self._db)
                return


class AlibabaUserEditFile(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.CharField(max_length=191)
    repo_id = models.CharField(max_length=36)
    path = models.TextField()
    start_timestamp = models.DateTimeField(default=timezone.now)
    end_timestamp = models.DateTimeField(blank=True, null=True)
    wopi_lock = models.TextField()

    objects = AlibabaUserEditFileManager()

    class Meta:
        managed = False
        db_table = 'alibaba_usereditfile'
