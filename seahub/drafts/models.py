# -*- coding: utf-8 -*-

import os
import posixpath
import uuid

from django.db import models
from seaserv import seafile_api

from seahub.base.fields import LowerCaseCharField
from seahub.base.models import TimestampedModel
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.tags.models import FileUUIDMap
from seahub.utils import normalize_file_path
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from .utils import get_draft_file_name


class DraftFileExist(Exception):
    pass


class DraftFileConflict(Exception):
    pass


class OriginalFileConflict(Exception):
    pass


class DraftManager(models.Manager):
    def get_draft_counts_by_repo_id(self, repo_id, status='open'):
        num = self.filter(origin_repo_id=repo_id, status='open').count()

        return num

    def list_draft_by_repo_id(self, repo_id, status='open'):
        """list draft by repo id
        """
        drafts = []
        qs = self.filter(origin_repo_id=repo_id, status=status)

        for d in qs:
            draft = {}
            draft['id'] = d.id
            draft['owner_nickname'] = email2nickname(d.username)
            draft['origin_repo_id'] = d.origin_repo_id
            draft['draft_file_path'] = d.draft_file_path
            draft['created_at'] = datetime_to_isoformat_timestr(d.created_at)

            drafts.append(draft)

        return drafts

    def list_draft_by_username(self, username, status='open'):
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
        qs = self.filter(username=username, status=status)

        for d in qs:
            # If repo does not exist, no related items are displayed.
            repo = get_repo_with_cache(d.origin_repo_id, repo_cache)
            if not repo:
                continue

            uuid = FileUUIDMap.objects.get_fileuuidmap_by_uuid(d.origin_file_uuid)
            file_path = posixpath.join(uuid.parent_path, uuid.filename)

            draft = {}
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
            draft['status'] = d.status

            data.append(draft)

        return data

    def create_exist_file_draft(self, repo, username, file_uuid, file_path):

        # check draft file does not exists and copy origin file content to
        # draft file
        draft_file_name = get_draft_file_name(repo.id, file_path)
        draft_file_path = '/Drafts/' + draft_file_name

        try:
            # Determine if there is a draft of the file
            d = self.get(origin_file_uuid=file_uuid.uuid)
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


    def add(self, username, repo, file_path, file_exist=True, file_id=None, org_id=-1, status='open'):
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
                           origin_repo_id=repo.id,
                           origin_file_uuid=file_uuid.uuid,
                           status=status,
                           origin_file_version=file_id,
                           draft_file_path=file_path)
        draft.save(using=self._db)
        return draft


class Draft(TimestampedModel):
    """Draft models enable user save file as drafts, and publish later.
    """
    username = LowerCaseCharField(max_length=255, db_index=True)
    status = models.CharField(max_length=20, default='open')
    draft_file_path = models.CharField(max_length=1024)
    origin_repo_id = models.CharField(max_length=36, db_index=True)
    origin_file_uuid = models.UUIDField(unique=True)
    origin_file_version = models.CharField(max_length=100)
    publish_file_version = models.CharField(max_length=100, null=True)

    objects = DraftManager()

    # class Meta:
    #     unique_together = (('username', 'draft_repo_id'), )

    def update(self, publish_file_version, status = 'published'):
        self.publish_file_version = publish_file_version
        self.status = status
        self.save()

    def delete(self, operator):
        draft_file_name = os.path.basename(self.draft_file_path)
        draft_file_path = os.path.dirname(self.draft_file_path)
        seafile_api.del_file(self.origin_repo_id, draft_file_path,
                             draft_file_name, operator)

        super(Draft, self).delete()

    def to_dict(self):
        uuid = FileUUIDMap.objects.get_fileuuidmap_by_uuid(self.origin_file_uuid)
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


class DraftReviewerManager(models.Manager):
    def add(self, reviewer, draft):
        reviewer = self.model(reviewer=reviewer, draft=draft)
        reviewer.save(using=self._db)

        return reviewer


class DraftReviewer(models.Model):
    """
    Model used to record review reviewer.
    """
    reviewer = LowerCaseCharField(max_length=255, db_index=True)
    draft = models.ForeignKey('Draft', on_delete=models.CASCADE)

    objects = DraftReviewerManager()

    def to_dict(self):
        return {
            'name': email2nickname(self.reviewer),
            'email': self.reviewer,
            'contact_email': email2contact_email(self.reviewer)
        }
