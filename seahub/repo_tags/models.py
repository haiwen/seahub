# -*- coding: utf-8 -*-

from django.db import models


class RepoTagsManager(models.Manager):

    def get_all_by_repo_id(self, repo_id):
        return super(RepoTagsManager, self).filter(repo_id=repo_id)

    def get_repo_tag_by_name(self, repo_id, tag_name):
        try:
            return super(RepoTagsManager, self).get(repo_id=repo_id, name=tag_name)
        except self.model.DoesNotExist:
            return None

    def get_repo_tag_by_id(self, repo_tag_id):
        try:
            return super(RepoTagsManager, self).get(pk=repo_tag_id)
        except self.model.DoesNotExist:
            return None

    def create_repo_tag(self, repo_id, tag_name, tag_color):
        try:
            return super(RepoTagsManager, self).get(repo_id=repo_id, name=tag_name, color=tag_color)
        except self.model.DoesNotExist:
            repo_tag = self.model(repo_id=repo_id, name=tag_name, color=tag_color)
            repo_tag.save()
            return repo_tag

    def delete_repo_tag(self, repo_tag_id):
        try:
            repo_tag = super(RepoTagsManager, self).get(pk=repo_tag_id)
            repo_tag.delete()
            return True
        except self.model.DoesNotExist:
            return False


class RepoTags(models.Model):

    repo_id = models.CharField(max_length=36, db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    color = models.CharField(max_length=255, db_index=True)

    objects = RepoTagsManager()

    def to_dict(self):
        return {
            "repo_tag_id": self.pk,
            "repo_id": self.repo_id,
            "tag_name": self.name,
            "tag_color": self.color,
        }
