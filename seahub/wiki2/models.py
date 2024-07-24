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


class WikiPublish(models.Model):
    wiki_id = models.CharField(max_length=36, unique=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    visit_times = models.IntegerField(default=0)
    creator = models.CharField(max_length=255)
    custom_url = models.CharField(max_length=100, null=True, unique=True)
    inactive = models.BooleanField(default=False)
    version = models.IntegerField(default=1)

    class Meta:
        db_table = 'WikiPublish'

    def to_dict(self):
        return {
            'wiki_id': self.wiki_id,
            'created_at': self.created_at,
            'visit_times': self.visit_times,
            'creator': self.creator,
            'custom_url': self.custom_url,
            'inactive': self.inactive,
            'version': self.version
        }


###### signal handlers
from django.dispatch import receiver
from seahub.signals import repo_deleted

@receiver(repo_deleted)
def remove_wiki(sender, **kwargs):
    repo_id = kwargs['repo_id']
    return
