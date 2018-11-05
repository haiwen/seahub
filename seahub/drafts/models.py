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
from seahub.utils import normalize_file_path, EMPTY_SHA1
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from .utils import create_user_draft_repo, get_draft_file_name


class DraftFileExist(Exception):
    pass


class DraftFileConflict(Exception):
    pass


class DraftManager(models.Manager):
    def create_exist_file_draft(self, repo, username, file_uuid, file_path):
        # create drafts dir if any
        draft_dir_id = seafile_api.get_dir_id_by_path(repo.id, '/Drafts')
        if draft_dir_id is None:
            seafile_api.post_dir(repo.id, '/', 'Drafts', username)

        # check draft file does not exists and copy origin file content to
        # draft file
        draft_file_name = get_draft_file_name(repo.id, file_path)
        draft_file_path = '/Drafts/' + draft_file_name

        if seafile_api.get_file_id_by_path(repo.id, draft_file_path):
            raise DraftFileExist

        # copy file to draft dir
        seafile_api.copy_file(repo.id, file_uuid.parent_path, file_uuid.filename,
                              repo.id, '/Drafts', draft_file_name,
                              username=username, need_progress=0, synchronous=1)

        return draft_file_path

    def add(self, username, repo, file_path, file_exist=True, file_id=None, org_id=-1):
        file_path = normalize_file_path(file_path)
        parent_path = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(
            repo.id, parent_path, filename, is_dir=False)

        if file_id is None:
            file_id = seafile_api.get_file_id_by_path(repo.id, file_path)

        if file_exist:
            file_path = self.create_exist_file_draft(repo, username, file_uuid, file_path)

        draft = self.model(username=username,
                           origin_repo_id=repo.id, origin_file_uuid=file_uuid,
                           origin_file_version=file_id,
                           draft_file_path=file_path)
        draft.save(using=self._db)
        return draft


class Draft(TimestampedModel):
    """Draft models enable user save file as drafts, and publish later.
    """
    username = LowerCaseCharField(max_length=255, db_index=True)
    origin_repo_id = models.CharField(max_length=36)
    origin_file_uuid = models.ForeignKey(FileUUIDMap, on_delete=models.CASCADE)
    origin_file_version = models.CharField(max_length=100)
    draft_file_path = models.CharField(max_length=1024)

    objects = DraftManager()

    # class Meta:
    #     unique_together = (('username', 'draft_repo_id'), )

    def delete(self):
        draft_file_name = os.path.basename(self.draft_file_path)
        draft_file_path = os.path.dirname(self.draft_file_path)
        seafile_api.del_file(self.origin_repo_id, draft_file_path,
                             draft_file_name, self.username)

        super(Draft, self).delete()

    def publish(self):
        # check whether origin file is updated
        r_repo = seafile_api.get_repo(self.origin_repo_id)
        if not r_repo:
            raise DraftFileConflict

        if self.origin_file_uuid.parent_path == '/':
            origin_file_path = self.origin_file_uuid.parent_path + self.origin_file_uuid.filename
        else:
            origin_file_path = self.origin_file_uuid.parent_path + '/' + self.origin_file_uuid.filename

        file_id = seafile_api.get_file_id_by_path(self.origin_repo_id,
                                                  origin_file_path)
        if not file_id:
            raise DraftFileConflict

        draft_file_name = os.path.basename(self.draft_file_path)
        draft_file_path = os.path.dirname(self.draft_file_path)

        file_name = self.origin_file_uuid.filename

        if file_id != self.origin_file_version and self.draft_file_path != origin_file_path:
            raise DraftFileConflict

        if self.draft_file_path == origin_file_path:
            f = os.path.splitext(draft_file_name)[0][:-7]
            file_type = os.path.splitext(draft_file_name)[-1]
            file_name = f + file_type

        # move draft file to origin file
        seafile_api.move_file(
            self.origin_repo_id, draft_file_path, draft_file_name,
            self.origin_repo_id, self.origin_file_uuid.parent_path,
            file_name, replace=1,
            username=self.username, need_progress=0, synchronous=1
        )

    def to_dict(self):
        uuid = self.origin_file_uuid
        file_path = posixpath.join(uuid.parent_path, uuid.filename)

        repo = seafile_api.get_repo(self.origin_repo_id)

        review_id = None
        review_status = None
        if hasattr(self, 'draftreview'):
            review_id = self.draftreview.id
            review_status = self.draftreview.status

        return {
            'id': self.pk,
            'review_id': review_id,
            'review_status': review_status,
            'owner': self.username,
            'repo_name': repo.name,
            'owner_nickname': email2nickname(self.username),
            'origin_repo_id': self.origin_repo_id,
            'origin_file_path': file_path,
            'origin_file_version': self.origin_file_version,
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
                                  draft_id=draft,
                                  origin_repo_id=draft.origin_repo_id,
                                  origin_file_uuid=draft.origin_file_uuid,
                                  draft_file_path=draft.draft_file_path,
                                  origin_file_version=draft.origin_file_version)
        draft_review.save(using=self._db)

        return draft_review


class DraftReview(TimestampedModel):
    creator = LowerCaseCharField(max_length=255, db_index=True)
    status = models.CharField(max_length=20)
    origin_repo_id = models.CharField(max_length=36)
    origin_file_uuid = models.ForeignKey(FileUUIDMap, on_delete=models.CASCADE)
    draft_file_path = models.CharField(max_length=1024)
    origin_file_version = models.CharField(max_length=100)
    publish_file_version = models.CharField(max_length=100, null=True)
    draft_id = models.OneToOneField(Draft, null=True, on_delete=models.SET_NULL)

    objects = DraftReviewManager()

    def to_dict(self):
        r_repo = seafile_api.get_repo(self.origin_repo_id)
        if not r_repo:
            raise DraftFileConflict

        uuid = self.origin_file_uuid
        file_path = posixpath.join(uuid.parent_path, uuid.filename)

        return {
            'id': self.pk,
            'creator': self.creator,
            'status': self.status,
            'creator_name': email2nickname(self.creator),
            'draft_origin_repo_id': self.origin_repo_id,
            'draft_origin_repo_name': r_repo.name,
            'draft_origin_file_path': file_path,
            'draft_origin_file_version': self.origin_file_version,
            'draft_publish_file_version': self.publish_file_version,
            'draft_file_path': self.draft_file_path,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'updated_at': datetime_to_isoformat_timestr(self.updated_at),
        }


class ReviewCommentManager(models.Manager):
    def add(self, comment, detail, author, review_id):
        review_comment = self.model(author=author, comment=comment,
                                    detail=detail, review_id=review_id)
        review_comment.save(using=self._db)

        return review_comment


class ReviewComment(TimestampedModel):
    """
    Model used to record file comments.
    """
    author = LowerCaseCharField(max_length=255, db_index=True)
    resolved = models.BooleanField(default=False, db_index=True)
    review_id = models.ForeignKey('DraftReview', on_delete=models.CASCADE)
    comment = models.TextField()
    detail = models.TextField()

    objects = ReviewCommentManager()

    def to_dict(self):
        return {
            'id': self.pk,
            'review_id': self.review_id_id,
            'comment': self.comment,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'updated_at': datetime_to_isoformat_timestr(self.updated_at),
            'resolved': self.resolved,
            'detail': self.detail,
        }
