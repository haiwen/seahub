# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.db import models

from seaserv import seafile_api


class RepoTagsManager(models.Manager):

    def get_all_by_repo_id(self, repo_id):
        return [repo_tag for repo_tag in super(RepoTagsManager, self).all().filter(repo_id=repo_id)]

    def get_or_create_repo_tag(self, repo_id, tag_name, tag_color):
        try:
            return super(RepoTagsManager, self).get(repo_id=repo_id, name=tag_name, color=tag_color)
        except self.model.DoesNotExist:
            repo_tag = self.model(repo_id=repo_id, name=tag_name, color=tag_color)
            repo_tag.save()
            return repo_tag

    def delete_repo_tag(self, tag_id):
        repo_tag = super(RepoTagsManager, self).get(pk=tag_id)
        repo_tag.delete()


class RepoTags(models.Model):

    repo_id = models.CharField(max_length=36, db_index=True)
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=255)

    objects = RepoTagsManager()

    def to_dict(self):
        repo = seafile_api.get_repo(self.repo_id)
        if not repo:
            return None

        return {
            "id": self.pk,
            "repo_id": self.repo_id,
            "tag_name": self.name,
            "tag_color": self.color,
        }
