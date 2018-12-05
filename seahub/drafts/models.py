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

    def delete(self, operator):
        draft_file_name = os.path.basename(self.draft_file_path)
        draft_file_path = os.path.dirname(self.draft_file_path)
        seafile_api.del_file(self.origin_repo_id, draft_file_path,
                             draft_file_name, operator)

        if hasattr(self, 'draftreview'):
            if self.draftreview.status == 'closed':
                self.draftreview.delete()

        super(Draft, self).delete()

    def publish(self, operator):
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
            username=operator, need_progress=0, synchronous=1
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
                                  author=draft.username,
                                  status='open',
                                  draft_id=draft,
                                  origin_repo_id=draft.origin_repo_id,
                                  origin_file_uuid=draft.origin_file_uuid,
                                  draft_file_path=draft.draft_file_path,
                                  origin_file_version=draft.origin_file_version)
        draft_review.save(using=self._db)

        return draft_review

    def get_reviews_by_creator_and_status(self, creator, status):

        from seahub.api2.utils import user_to_dict
        reviews = self.filter(creator=creator, status=status)
        reviewers = ReviewReviewer.objects.filter(review_id__in=reviews)

        data = []
        for review in reviews:
            reviewer_list = []
            for r in reviewers:
                if review.id == r.review_id_id:
                    reviewer = user_to_dict(r.reviewer, avatar_size=64)
                    reviewer_list.append(reviewer)

            author = user_to_dict(review.creator, avatar_size=64)

            review = review.to_dict()
            review.update({'reviewers': reviewer_list})
            review.update({'author': author})
            data.append(review)

        return data

    def get_reviews_by_reviewer_and_status(self, reviewer, status):

        from seahub.api2.utils import user_to_dict
        reviews = self.filter(reviewreviewer__reviewer=reviewer, status=status)
        reviewers = ReviewReviewer.objects.filter(review_id__in=reviews)

        data = []
        for review in reviews:
            reviewer_list = []
            for r in reviewers:
                if review.id == r.review_id_id:
                    reviewer = user_to_dict(r.reviewer, avatar_size=64)
                    reviewer_list.append(reviewer)

            author = user_to_dict(review.creator, avatar_size=64)

            review = review.to_dict()
            review.update({'author': author})
            review.update({'reviewers': reviewer_list})
            data.append(review)

        return data


class DraftReview(TimestampedModel):
    creator = LowerCaseCharField(max_length=255, db_index=True)
    author = LowerCaseCharField(max_length=255, db_index=True)
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

        return {
            'id': self.pk,
            'creator': self.creator,
            'status': self.status,
            'creator_name': email2nickname(self.creator),
            'draft_origin_repo_id': self.origin_repo_id,
            'draft_origin_repo_name': r_repo.name,
            'draft_origin_file_version': self.origin_file_version,
            'draft_publish_file_version': self.publish_file_version,
            'draft_file_path': self.draft_file_path,
            'created_at': datetime_to_isoformat_timestr(self.created_at),
            'updated_at': datetime_to_isoformat_timestr(self.updated_at),
        }

    def delete(self):
        super(DraftReview, self).delete()

    def close(self):
        self.status = 'closed'
        self.save()

    def publish(self, operator):
        uuid = self.origin_file_uuid
        origin_file_path = posixpath.join(uuid.parent_path, uuid.filename)

        # if it is a new draft
        # case1. '/path/test(draft).md' ---> '/path/test.md'
        # case2. '/path/test(dra.md' ---> '/path/test(dra.md'
        new_draft_dir = os.path.dirname(origin_file_path)
        new_draft_name = os.path.basename(origin_file_path)

        if self.draft_file_path == origin_file_path:
            draft_flag = os.path.splitext(new_draft_name)[0][-7:]
            # remove `(draft)` from file name
            if draft_flag == '(draft)':
                f = os.path.splitext(new_draft_name)[0][:-7]
                file_type = os.path.splitext(new_draft_name)[-1]
                new_draft_name = f + file_type

            if new_draft_dir == '/':
                origin_file_path = new_draft_dir + new_draft_name
            else:
                origin_file_path = new_draft_dir + '/' + new_draft_name

            self.draft_file_path = origin_file_path

        self.draft_id.publish(operator=operator)

        # get draft published version
        file_id = seafile_api.get_file_id_by_path(self.origin_repo_id, origin_file_path)
        self.publish_file_version = file_id
        self.status = 'finished'
        self.save()
        self.draft_id.delete(operator=operator)


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


class ReviewReviewerManager(models.Manager):
    def add(self, reviewer, review_id):
        review_reviewer = self.model(reviewer=reviewer, review_id=review_id)
        review_reviewer.save(using=self._db)

        return review_reviewer


class ReviewReviewer(models.Model):
    """
    Model used to record review reviewer.
    """
    reviewer = LowerCaseCharField(max_length=255, db_index=True)
    review_id = models.ForeignKey('DraftReview', on_delete=models.CASCADE)

    objects = ReviewReviewerManager()

    def to_dict(self):
        return {
            'nickname': email2nickname(self.reviewer),
            'name': self.reviewer,
        }
