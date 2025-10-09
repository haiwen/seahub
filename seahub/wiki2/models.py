# Copyright (c) 2012-2016 Seafile Ltd.
import json
import random
import string
from django.db import models
from seaserv import seafile_api

from seahub.utils import get_no_duplicate_obj_name
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

def generate_random_string_lower_digits(length):
    letters_and_digits = string.ascii_lowercase + string.digits
    random_string = ''.join(random.choice(letters_and_digits) for i in range(length))
    return random_string

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

class WikiView(object):
    def __init__(self, name, linked_repo_id, type='table', view_data={}):
        self.name = name
        self.type = type
        self.linked_repo_id = linked_repo_id
        self.view_data = view_data
        self.view_json = {}

        self.init_view()

    def init_view(self):
        self.view_json = {
            "_id": generate_random_string_lower_digits(4),
            "table_id": '0001',  # by default
            "name": self.name,
            "filters": [],
            "sorts": [],
            "groupbys": [],
            "filter_conjunction": "And",
            "hidden_columns": [],
            "type": self.type,
            "linked_repo_id": self.linked_repo_id
        }
        self.view_json.update(self.view_data)

class WikiViewsManager(models.Manager):
    def add_view(self, wiki_id, view_name, linked_repo_id, view_type='table', view_data={}):
        wiki_views = self.filter(wiki_id=wiki_id).first()
        if not wiki_views:
            # init view data
            new_view = WikiView(view_name, linked_repo_id, view_type, view_data)

            view_json = new_view.view_json
            view_id = view_json.get('_id')
            view_details = {
                'views': [view_json],
                'navigation': [{'_id': view_id, 'type': 'view'}, ]
            }
            self.create(
                wiki_id=wiki_id,
                details=json.dumps(view_details)
            )
        else:
            view_details = json.loads(wiki_views.details)
            navigation = view_details.get('navigation', [])
            view_name = get_no_duplicate_obj_name(view_name, wiki_views.views_names)
            new_view = WikiView(view_name, linked_repo_id, view_type, view_data)
            view_json = new_view.view_json
            view_id = view_json.get('_id')
            view_details['views'].append(view_json)
            new_view_nav = { '_id': view_id, 'type': 'view' }
            navigation.append(new_view_nav)
            wiki_views.details = json.dumps(view_details)
            wiki_views.save()
        return new_view.view_json

    def list_views(self, wiki_id):
        wiki_views = self.filter(wiki_id=wiki_id).first()
        if not wiki_views:
            return {'views': [], 'navigation': []}
        return json.loads(wiki_views.details)

    def get_view(self, wiki_id, view_id):
        wiki_views = self.filter(wiki_id=wiki_id).first()
        if not wiki_views:
            return None
        view_details = json.loads(wiki_views.details)
        for v in view_details['views']:
            if v.get('_id') == view_id:
                return v

    def update_view(self, wiki_id, view_id, view_dict):
        wiki_views = self.filter(wiki_id=wiki_id).first()
        view_dict.pop('_id', '')
        if 'name' in view_dict:
            exist_obj_names = wiki_views.views_names
            view_dict['name'] = get_no_duplicate_obj_name(view_dict['name'], exist_obj_names)
        view_details = json.loads(wiki_views.details)
        for v in view_details['views']:
            if v.get('_id') == view_id:
                v.update(view_dict)
                break
        wiki_views.details = json.dumps(view_details)
        wiki_views.save()
        return json.loads(wiki_views.details)

    def delete_view(self, wiki_id, view_id):
        wiki_views = self.filter(wiki_id=wiki_id).first()
        view_details = json.loads(wiki_views.details)
        navigation = view_details.get('navigation', [])
        views = view_details.get('views', [])

        for view in views:
            if view.get('_id') == view_id:
                views.remove(view)
                break
        for nav_item in navigation:
            if nav_item.get('_id') == view_id:
                navigation.remove(nav_item)
                break

        wiki_views.details = json.dumps(view_details)
        wiki_views.save()
        return json.loads(wiki_views.details)

class WikiViews(models.Model):
    wiki_id = models.CharField(max_length=36, db_index=True)
    details = models.TextField()

    objects = WikiViewsManager()

    class Meta:
        db_table = 'wiki_view'

    @property
    def views_ids(self):
        wiki_views = json.loads(self.details)
        views = wiki_views.get('views', [])
        return [v.get('_id') for v in views]

    @property
    def views_names(self):
        wiki_views = json.loads(self.details)
        views = wiki_views.get('views', [])
        return [v.get('name') for v in views]


###### signal handlers
from django.dispatch import receiver
from seahub.signals import repo_deleted

@receiver(repo_deleted)
def remove_wiki(sender, **kwargs):
    repo_id = kwargs['repo_id']
    return
