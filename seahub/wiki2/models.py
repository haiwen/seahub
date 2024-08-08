# Copyright (c) 2012-2016 Seafile Ltd.
from django.db import models
from django.utils import timezone
from seaserv import seafile_api

from seahub.base.fields import LowerCaseCharField
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr


class WikiDoesNotExist(Exception):
    pass


class WikiManager():
    def get(self, wiki_id):
        repo = seafile_api.get_repo(wiki_id)
        if not repo:
            return None
        return Wiki2(repo)


class Wiki2(object):
    """New wiki model to enable a user has multiple wikis and replace
    personal wiki.
    """
    objects = WikiManager()
    
    def __init__(self, wiki, owner=None):
        # wiki a wiki type repo object
        self.pk = wiki.id
        self.id = wiki.id
        self.owner = owner or wiki.owner
        self.name = wiki.repo_name
        self.updated_at = timestamp_to_isoformat_timestr(wiki.last_modify)
        self.repo_id = wiki.repo_id
    
    def to_dict(self):
        return {
            'id': self.pk,
            'owner': self.owner,
            'name': self.name,
            'updated_at': self.updated_at,
            'repo_id': self.repo_id,
        }


class Wiki2Publish(models.Model):
    repo_id = models.CharField(max_length=36, unique=True, db_index=True)
    publish_url = models.CharField(max_length=40, null=True, unique=True)
    username = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    visit_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'wiki_wiki2_publish'

    def to_dict(self):
        return {
            'repo_id': self.repo_id,
            'publish_url': self.publish_url,
            'username': self.username,
            'created_at': self.created_at,
            'visit_count': self.visit_count
        }


###### signal handlers
from django.dispatch import receiver
from seahub.signals import repo_deleted

@receiver(repo_deleted)
def remove_wiki(sender, **kwargs):
    repo_id = kwargs['repo_id']
    return
