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


class OriginalFileConflict(Exception):
    pass


class DraftManager(models.Manager):
    def get_draft_counts_by_repo_id(self, repo_id):
        num = self.filter(origin_repo_id=repo_id).count()

        return num

    def list_draft_by_repo_id(self, repo_id):
        """list draft by repo id
        """
        drafts = []
        qs = self.filter(origin_repo_id=repo_id)

        for d in qs:
            draft = {}
            draft['id'] = d.id
            draft['owner_nickname'] = email2nickname(d.username)
            draft['origin_repo_id'] = d.origin_repo_id
            draft['draft_file_path'] = d.draft_file_path
            draft['created_at'] = datetime_to_isoformat_timestr(d.created_at)

            drafts.append(draft)

        return drafts

    def list_draft_by_username(self, username, with_reviews=True):
        """list all user drafts 
        If with_reviews is true, return the draft associated review
        """
        repo_cache = {}

        def get_repo_with_cache(repo_id, repo_cache):
            """return repo object
            Avoid loading the same repo multiple times
            """
            if repo_id in repo_cache:
                return repo_cache[repo_id]

            repo = seafile_api.get_repo(repo_id)
            repo_cache[repo_id] = repo
            return repo

        data = []
        qs = self.filter(username=username)
        if with_reviews:
            qs_r = list(DraftReview.objects.filter(draft_id__in=qs))

        for d in qs:
            # If repo does not exist, no related items are displayed.
            repo = get_repo_with_cache(d.origin_repo_id, repo_cache)
            if not repo:
                continue

            uuid = d.origin_file_uuid
            file_path = posixpath.join(uuid.parent_path, uuid.filename)

            draft = {}
            # Query whether there is an associated review
            if with_reviews:
                draft['review_id'] = None
                draft['review_status'] = None
                for r in qs_r:
                    if r.draft_id == d:
                        draft['review_id'] = r.id
                        draft['review_status'] = r.status

            draft['id'] = d.id
            draft['owner'] = d.username
            draft['repo_name'] = repo.name
            draft['owner_nickname'] = email2nickname(d.username)
            draft['origin_repo_id'] = d.origin_repo_id
            draft['origin_file_path'] = file_path
            draft['origin_file_version'] = d.origin_file_version
            draft['draft_file_path'] = d.draft_file_path
            draft['created_at'] = datetime_to_isoformat_timestr(d.created_at)
            draft['updated_at'] = datetime_to_isoformat_timestr(d.updated_at)

            data.append(draft)

        return data

    def create_exist_file_draft(self, repo, username, file_uuid, file_path):
        # create drafts dir if does not exist
        draft_dir_id = seafile_api.get_dir_id_by_path(repo.id, '/Drafts')
        if draft_dir_id is None:
            seafile_api.post_dir(repo.id, '/', 'Drafts', username)

        # check draft file does not exists and copy origin file content to
        # draft file
        draft_file_name = get_draft_file_name(repo.id, file_path)
        draft_file_path = '/Drafts/' + draft_file_name

        try:
            # Determine if there is a draft of the file
            d = self.get(origin_file_uuid=file_uuid)
        except Draft.DoesNotExist:
            try:
                # Determine if there is a draft with the same name as
                # the generated draft file path
                d_2 = self.get(origin_repo_id=repo.id, draft_file_path=draft_file_path)
                d_2.delete(operator=username)
            except Draft.DoesNotExist:
                pass

            # copy file to draft dir
            seafile_api.copy_file(repo.id, file_uuid.parent_path, file_uuid.filename,
                                  repo.id, '/Drafts', draft_file_name,
                                  username=username, need_progress=0, synchronous=1)

            return draft_file_path

        if d:
            file_id = seafile_api.get_file_id_by_path(repo.id, d.draft_file_path)
            # If the database entry exists and the draft file exists,
            # then raise DraftFileExist
            if file_id:
                raise DraftFileExist
            # If the database entry exists and the draft file does not exist,
            # delete the database entry
            else:
                d.delete(operator=username)

                # copy file to draft dir
                seafile_api.copy_file(repo.id, file_uuid.parent_path, file_uuid.filename,
                                      repo.id, '/Drafts', draft_file_name,
                                      username=username, need_progress=0, synchronous=1)

                return draft_file_path

    def add(self, username, repo, file_path, file_exist=True, file_id=None, org_id=-1):
        file_path = normalize_file_path(file_path)
        parent_path = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        # origin file uuid
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
            if self.draftreview.status != 'finished':
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

        draft_file_name = os.path.basename(self.draft_file_path)
        draft_file_path = os.path.dirname(self.draft_file_path)
        file_name = self.origin_file_uuid.filename

        if file_id:
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

        else:
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

        return {
            'id': self.pk,
            'owner': self.username,
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
    def get_review_counts_by_repo_id(self, repo_id, status='open'):
        num = self.filter(origin_repo_id=repo_id, status=status).count()

        return num

    def list_review_by_repo_id(self, repo_id, status='open'):
        reviews = []
        qs = self.filter(origin_repo_id=repo_id, status=status)

        for review in qs:
            review_obj = {}
            review_obj['id'] = review.id
            review_obj['creator_name'] = email2nickname(review.creator)
            review_obj['created_at'] = datetime_to_isoformat_timestr(review.created_at)
            review_obj['draft_file_path'] = review.draft_file_path
            reviews.append(review_obj)

        return reviews

    def add(self, creator, draft, author=None):
        try:
            d_r = self.get(creator=creator, draft_id=draft)
            if d_r.status == 'closed':
                d_r.delete()
            if d_r.status == 'open':
                raise DraftReviewExist
        except DraftReview.DoesNotExist:
            pass

        if author:
            author = author
        else:
            author = draft.username

        draft_review = self.model(creator=creator,
                                  author=author,
                                  status='open',
                                  draft_id=draft,
                                  origin_repo_id=draft.origin_repo_id,
                                  origin_file_uuid=draft.origin_file_uuid,
                                  draft_file_path=draft.draft_file_path,
                                  origin_file_version=draft.origin_file_version)
        draft_review.save(using=self._db)

        return draft_review

    def get_reviews_by_creator_and_status(self, creator, status, with_reviewers=True):
        """
        List all reviews as creator according to a certain status
        """
        repo_cache = {}

        def get_repo_with_cache(repo_id, repo_cache):
            """return repo object
            Avoid loading the same repo multiple times
            """
            if repo_id in repo_cache:
                return repo_cache[repo_id]

            repo = seafile_api.get_repo(repo_id)
            repo_cache[repo_id] = repo

            return repo

        from seahub.api2.utils import user_to_dict
        reviews = self.filter(creator=creator, status=status)

        if with_reviewers:
            reviewers = list(ReviewReviewer.objects.filter(review_id__in=reviews))

        data = []
        for review in reviews:

            if with_reviewers:
                reviewer_list = []
                for r in reviewers:
                    if review.id == r.review_id_id:
                        reviewer = user_to_dict(r.reviewer, avatar_size=64)
                        reviewer_list.append(reviewer)

            author = user_to_dict(review.creator, avatar_size=64)

            # If repo does not exist, no related items are displayed.
            repo = get_repo_with_cache(review.origin_repo_id, repo_cache) 
            if not repo:
                continue

            review_obj = {}
            review_obj['id'] = review.id
            review_obj['creator'] = review.creator
            review_obj['status'] = review.status
            review_obj['creator_name'] = email2nickname(review.creator)
            review_obj['draft_origin_repo_id'] = review.origin_repo_id
            review_obj['draft_origin_repo_name'] = repo.name
            review_obj['draft_origin_file_version'] = review.origin_file_version
            review_obj['draft_publish_file_version'] = review.publish_file_version
            review_obj['draft_file_path'] = review.draft_file_path
            review_obj['created_at'] = datetime_to_isoformat_timestr(review.created_at)
            review_obj['updated_at'] = datetime_to_isoformat_timestr(review.updated_at)

            if review_obj and with_reviewers:
                review_obj.update({'reviewers': reviewer_list})

            if review_obj:
                review_obj.update({'author': author})
                data.append(review_obj)

        return data

    def get_reviews_by_reviewer_and_status(self, reviewer, status):
        """
        List all reviews as reviewers according to a certain status
        """
        repo_cache = {}

        def get_repo_with_cache(repo_id, repo_cache):
            """return repo object
            Avoid loading the same repo multiple times
            """
            if repo_id in repo_cache:
                return repo_cache[repo_id]

            repo = seafile_api.get_repo(repo_id)
            repo_cache[repo_id] = repo

            return repo

        from seahub.api2.utils import user_to_dict
        reviews = self.filter(reviewreviewer__reviewer=reviewer, status=status)

        reviewers = list(ReviewReviewer.objects.filter(review_id__in=reviews))

        data = []
        for review in reviews:
            reviewer_list = []
            for r in reviewers:
                if review.id == r.review_id_id:
                    reviewer = user_to_dict(r.reviewer, avatar_size=64)
                    reviewer_list.append(reviewer)

            author = user_to_dict(review.creator, avatar_size=64)

            # If repo does not exist, no related items are displayed.
            repo = get_repo_with_cache(review.origin_repo_id, repo_cache)
            if not repo:
                continue

            review_obj = {}
            review_obj['id'] = review.id
            review_obj['creator'] = review.creator
            review_obj['status'] = review.status
            review_obj['creator_name'] = email2nickname(review.creator)
            review_obj['draft_origin_repo_id'] = review.origin_repo_id
            review_obj['draft_origin_repo_name'] = repo.name
            review_obj['draft_origin_file_version'] = review.origin_file_version
            review_obj['draft_publish_file_version'] = review.publish_file_version
            review_obj['draft_file_path'] = review.draft_file_path
            review_obj['created_at'] = datetime_to_isoformat_timestr(review.created_at)
            review_obj['updated_at'] = datetime_to_isoformat_timestr(review.updated_at)

            if review_obj:
                review_obj.update({'reviewers': reviewer_list})
                review_obj.update({'author': author})
                data.append(review_obj)

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
        return {
            'id': self.pk,
            'creator': self.creator,
            'status': self.status,
            'creator_name': email2nickname(self.creator),
            'draft_origin_repo_id': self.origin_repo_id,
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

        if not file_id:
            raise OriginalFileConflict

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
