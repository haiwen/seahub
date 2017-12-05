# Copyright (c) 2012-2016 Seafile Ltd.
import os
from django.db import models
from django.core.urlresolvers import reverse

from seahub.base.fields import LowerCaseCharField
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

import seaserv
from seaserv import seafile_api


########## manager
class TagsManager(models.Manager):
    def get_all_tag_name(self):
        return [tag.name for tag in super(TagsManager, self).all()]

    def get_or_create_tag(self, tagname):
        try:
            tag = super(TagsManager, self).get(name=tagname)
            return tag
        except self.model.DoesNotExist:
            tag = self.model(name=tagname)
            tag.save()
            return tag

class RevisionTagsManager(models.Manager):
    def get_one_revision_tag(self, repo_id, commit_id, tag_name):
        try:
            return super(RevisionTagsManager, self).get(
                    repo_id=repo_id,
                    revision_id=commit_id,
                    tag__name=tag_name)
        except:
            return None

    def create_revision_tag(self, repo_id, commit_id, tag_name, creator):
        revision_tag = self.get_one_revision_tag(repo_id, commit_id, tag_name)
        if revision_tag:
            return revision_tag, False
        else:
            tag = Tags.objects.get_or_create_tag(tag_name)
            revision_tag = self.model(repo_id=repo_id, revision_id=commit_id, tag=tag, username=creator)
            revision_tag.save()
            return revision_tag, True

    def delete_revision_tag(self, repo_id, commit_id, tag_name):
        revision_tag = self.get_one_revision_tag(repo_id, commit_id, tag_name)
        if not revision_tag:
            return False
        else:
            revision_tag.delete()
            return True

    def delete_revision_tag_by_name(self, repo_id, tag_name):
        tags = super(RevisionTagsManager, self).filter(repo_id=repo_id, tag__name=tag_name)
        tags.delete()

    def delete_all_revision_tag(self, repo_id, commit_id):
        super(RevisionTagsManager, self).filter(repo_id=repo_id, revision_id=commit_id).delete()

########## models
class Tags(models.Model):
    name = models.CharField(max_length=255, unique=True)
    objects = TagsManager()

class RevisionTags(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    path = models.TextField(default='/')
    revision_id = models.CharField(max_length=255, db_index=True)
    tag = models.ForeignKey("Tags", on_delete=models.CASCADE)
    username = LowerCaseCharField(max_length=255, db_index=True)
    objects = RevisionTagsManager()

    def to_dict(self):
        repo = seafile_api.get_repo(self.repo_id)
        if not repo:
            return None
        commit = seaserv.get_commit(repo.id, repo.revision, self.revision_id)
        email = commit.creator_name
        return  {"tag":self.tag.name,
                 "tag_creator": self.username,
                 "revision": {
                     "repo_id": self.repo_id,
                     "commit_id": self.revision_id,
                     "email": email,
                     "name": email2nickname(email),
                     "contact_email": email2contact_email(email),
                     "time": timestamp_to_isoformat_timestr(commit.ctime),
                     "description": commit.desc,
                     "link": reverse("repo_history_view", args=[self.repo_id])+"?commit_id=%s"%self.revision_id
                     }}

