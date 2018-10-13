# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.db import models

from seaserv import seafile_api


class TagsManager(models.Manager):

    def get_or_create_tag(self, tag_name, tag_color):
        try:
            return super(TagsManager, self).get(name=tag_name, color=tag_color)
        except self.model.DoesNotExist:
            tag = self.model(name=tag_name, color=tag_color)
            tag.save()
            return tag


class RepoTagsManager(models.Manager):

    def get_all_by_repo_id(self, repo_id):
        return [tag for tag in super(RepoTagsManager, self).all().filter(repo_id=repo_id)]

    def get_one_repo_tag(self, repo_id, tag_name, tag_color):
        try:
            return super(RepoTagsManager, self).get(repo_id=repo_id, tag__name=tag_name, tag__color=tag_color)
        except self.model.DoesNotExist:
            return None

    def create_repo_tag(self, repo_id, tag_name, tag_color):
        repo_tag = self.get_one_repo_tag(repo_id, tag_name, tag_color)
        if repo_tag is None:
            tag = Tags.objects.get_or_create_tag(tag_name, tag_color)
            repo_tag = self.model(repo_id=repo_id, tag=tag)
            repo_tag.save()
            return repo_tag, True
        else:
            return repo_tag, False

    def delete_repo_tag(self, id):
        tags = super(RepoTagsManager, self).filter(pk=id)
        tags.delete()


class Tags(models.Model):
    name = models.CharField(max_length=255, unique=True)
    color = models.CharField(max_length=255, unique=True)

    objects = TagsManager()


class RepoTags(models.Model):

    repo_id = models.CharField(max_length=36, db_index=True)
    tag = models.ForeignKey("Tags", on_delete=models.CASCADE)

    objects = RepoTagsManager()

    def to_dict(self):
        repo = seafile_api.get_repo(self.repo_id)
        if not repo:
            return None

        return {
            "id": self.pk,
            "repo_id": self.repo_id,
            # 'tag_id': self.tag.primary_key,
            "tag_name": self.tag.name,
            "tag_color": self.tag.color,
        }
