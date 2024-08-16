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


class WikiPageTrash(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    doc_uuid = models.TextField()
    page_id = models.CharField(max_length=4)
    parent_page_id = models.CharField(max_length=4)
    subpages = models.TextField()
    name = models.CharField(max_length=255)
    delete_time = models.DateTimeField(auto_now_add=True, blank=False, null=False)
    size = models.BigIntegerField(blank=False, null=False)

    class Meta:
        db_table = 'WikiPageTrash'

    def to_dict(self):
        return {
            'id': self.pk,
            'repo_id': self.repo_id,
            'doc_uuid': self.doc_uuid,
            'page_id': self.page_id,
            'parent_page_id': self.parent_page_id,
            'subpages': self.subpages,
            'name': self.name,
            'delete_time': self.delete_time,
            'size': self.size
        }

###### signal handlers
from django.dispatch import receiver
from seahub.signals import repo_deleted

@receiver(repo_deleted)
def remove_wiki(sender, **kwargs):
    repo_id = kwargs['repo_id']
    return
