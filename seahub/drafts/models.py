# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import os
import posixpath

from django.db import models
from seaserv import seafile_api

from seahub.base.fields import LowerCaseCharField
from seahub.base.models import TimestampedModel
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.tags.models import FileUUIDMap
from seahub.utils import normalize_file_path
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from .utils import create_user_draft_repo, get_draft_file_name


class DraftFileExist(Exception):
    pass


class DraftFileConflict(Exception):
    pass


class DraftManager(models.Manager):
    def get_user_draft_repo_id(self, username):
        r = self.filter(username=username).first()
        if r is None:
            return None
        else:
            return r.draft_repo_id

    def add(self, username, repo, file_path, file_id=None, org_id=-1):
        file_path = normalize_file_path(file_path)
        parent_path = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(
            repo.id, parent_path, filename, is_dir=False)

        if file_id is None:
            file_id = seafile_api.get_file_id_by_path(repo.id, file_path)

        # create draft repo if any
        draft_repo_id = self.get_user_draft_repo_id(username)
        if draft_repo_id is None:
            draft_repo_id = create_user_draft_repo(username)

        # check draft file does not exists and copy origin file content to
        # draft file
        draft_file_name = get_draft_file_name(repo.id, file_path)
        draft_file_path = '/' + draft_file_name

        if seafile_api.get_file_id_by_path(draft_repo_id, draft_file_path):
            raise DraftFileExist

        seafile_api.copy_file(repo.id, file_uuid.parent_path, file_uuid.filename,
                              draft_repo_id, '/', draft_file_name,
                              username=username, need_progress=0, synchronous=1)

        draft = self.model(username=username,
                           origin_repo_id=repo.id, origin_file_uuid=file_uuid,
                           origin_file_version=file_id,
                           draft_repo_id=draft_repo_id,
                           draft_file_path=draft_file_path)
        draft.save(using=self._db)
        return draft


class Draft(TimestampedModel):
    """Draft models enable user save file as drafts, and publish later.
    """
    username = LowerCaseCharField(max_length=255, db_index=True)
    origin_repo_id = models.CharField(max_length=36)
    origin_file_uuid = models.ForeignKey(FileUUIDMap, on_delete=models.CASCADE)
    origin_file_version = models.CharField(max_length=100)
    draft_repo_id = models.CharField(max_length=36)
    draft_file_path = models.CharField(max_length=2048)

    objects = DraftManager()

    # class Meta:
    #     unique_together = (('username', 'draft_repo_id'), )

    def delete(self):
        seafile_api.del_file(self.draft_repo_id, '/',
                             self.draft_file_path.lstrip('/'), self.username)

        super(Draft, self).delete()

    def publish(self):
        # check whether origin file is updated
        r_repo = seafile_api.get_repo(self.origin_repo_id)
        if not r_repo:
            raise DraftFileConflict

        origin_file_path = self.origin_file_uuid.parent_path + self.origin_file_uuid.filename
        file_id = seafile_api.get_file_id_by_path(self.origin_repo_id,
                                                  origin_file_path)
        if not file_id:
            raise DraftFileConflict

        if file_id != self.origin_file_version:
            raise DraftFileConflict

        # move draft file to origin file
        seafile_api.move_file(
            self.draft_repo_id, '/', self.draft_file_path.lstrip('/'),
            self.origin_repo_id, self.origin_file_uuid.parent_path,
            self.origin_file_uuid.filename, replace=1,
            username=self.username, need_progress=0, synchronous=1
        )

        self.delete()

    def to_dict(self):
        uuid = self.origin_file_uuid
        file_path = posixpath.join(uuid.parent_path, uuid.filename) # TODO: refactor uuid

        review_id = ''
        if hasattr(self, 'draftreview'):
            review_id = self.draftreview.id

        return {
            'id': self.pk,
            'review_id': review_id,
            'owner': self.username,
            'owner_nickname': email2nickname(self.username),
            'origin_repo_id': self.origin_repo_id,
            'origin_file_path': file_path,
            'origin_file_version': self.origin_file_version,
            'draft_repo_id': self.draft_repo_id,
            'draft_file_path': self.draft_file_path,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'updated_at': datetime_to_isoformat_timestr(self.updated_at),
        }


class DraftReviewExist(Exception):
    pass


class DraftReviewManager(models.Manager):
    def add(self, creator, draft):

        has_review = hasattr(draft, 'draftreview')
        if has_review:
            raise DraftReviewExist

        draft_review = self.model(creator=creator,
                                  status='open',
                                  draft_id=draft)
        draft_review.save(using=self._db)

        return draft_review


class DraftReview(TimestampedModel):
    creator = LowerCaseCharField(max_length=255, db_index=True)
    status = models.CharField(max_length=20)
    draft_id = models.OneToOneField(Draft, on_delete=models.CASCADE)

    objects = DraftReviewManager()

    def to_dict(self):
        uuid = self.draft_id.origin_file_uuid
        file_path = posixpath.join(uuid.parent_path, uuid.filename) # TODO: refactor uuid

        return {
            'id': self.pk,
            'creator': self.creator,
            'status': self.status,
            'creator_name': email2nickname(self.creator),
            'draft_id': self.draft_id_id,
            'draft_origin_repo_id': self.draft_id.origin_repo_id,
            'draft_origin_file_path': file_path,
            'draft_origin_file_version': self.draft_id.origin_file_version,
            'draft_repo_id': self.draft_id.draft_repo_id,
            'draft_file_path': self.draft_id.draft_file_path,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'updated_at': datetime_to_isoformat_timestr(self.updated_at),
        }


###### signal handlers
from django.dispatch import receiver
from seahub.signals import repo_deleted

@receiver(repo_deleted)
def remove_drafts(sender, **kwargs):
    repo_owner = kwargs['repo_owner']
    repo_id = kwargs['repo_id']

    Draft.objects.filter(username=repo_owner, draft_repo_id=repo_id).delete()
