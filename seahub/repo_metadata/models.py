import logging
import json
import random
import string
import copy
from django.db import models

from seahub.utils import get_no_duplicate_obj_name
from seahub.repo_metadata.constants import FACE_RECOGNITION_VIEW_ID


logger = logging.getLogger(__name__)


def generate_random_string_lower_digits(length):
    letters_and_digits = string.ascii_lowercase + string.digits
    random_string = ''.join(random.choice(letters_and_digits) for i in range(length))
    return random_string


def generate_view_id(length, type, view_ids=None):
    if type == 'face_recognition':
        return FACE_RECOGNITION_VIEW_ID

    if not view_ids:
        return generate_random_string_lower_digits(length)

    while True:
        new_id = generate_random_string_lower_digits(length)
        if new_id not in view_ids:
            break

    return new_id


class RepoMetadataManager(models.Manager):

    def enable_metadata(self, repo_id):
        metadata = self.filter(repo_id=repo_id).first()
        enabled = True
        from_commit = '0000000000000000000000000000000000000000'
        if not metadata:
            metadata = self.model(repo_id=repo_id, enabled=enabled, from_commit=from_commit)
        else:
            metadata.enabled = enabled
            metadata.from_commit = from_commit
            metadata.to_commit = None
        metadata.save()
        return metadata

    def enable_face_recognition(self, repo_id):
        metadata = self.filter(repo_id=repo_id).first()
        face_recognition_enabled = True
        metadata.face_recognition_enabled = face_recognition_enabled
        metadata.save()
        return metadata


class RepoMetadata(models.Model):

    repo_id = models.CharField(max_length=36, unique=True)
    created_time = models.DateTimeField(auto_now_add=True)
    modified_time = models.DateTimeField(auto_now=True)
    enabled = models.BooleanField(db_index=True)
    face_recognition_enabled = models.BooleanField(db_index=True)
    from_commit = models.CharField(max_length=40)
    to_commit = models.CharField(max_length=40)
    tags_enabled = models.BooleanField(db_index=True)
    tags_lang = models.CharField(max_length=36)
    last_face_cluster_time = models.DateTimeField(db_index=True, blank=True, null=True)
    details_settings = models.TextField()

    objects = RepoMetadataManager()

    class Meta:
        db_table = 'repo_metadata'


class RepoView(object):

    def __init__(self, name, type='table', view_data={}, view_ids=None):
        self.name = name
        self.type = type
        self.view_data = view_data
        self.view_json = {}

        self.init_view(view_ids)

    def init_view(self, view_ids=None):
        self.view_json = {
            "_id": generate_view_id(4, self.type, view_ids),
            "table_id": '0001',  # by default
            "name": self.name,
            "filters": [],
            "sorts": [],
            "groupbys": [],
            "filter_conjunction": "And",
            "hidden_columns": [],
            "type": self.type,
        }
        self.view_json.update(self.view_data)


class RepoMetadataViewsManager(models.Manager):

    def add_view(self, repo_id, view_name, view_type='table', view_data={}):
        metadata_views = self.filter(repo_id=repo_id).first()
        if not metadata_views:
            from seafevents.repo_metadata.constants import METADATA_TABLE

            # init view data
            new_view = RepoView(view_name, view_type, {
                'basic_filters': [{ 'column_key': METADATA_TABLE.columns.is_dir.key, 'filter_predicate': 'is', 'filter_term': 'file' }],
                'sorts': [{ 'column_key': METADATA_TABLE.columns.file_mtime.key, 'sort_type': 'down' }]
            })

            view_json = new_view.view_json
            view_id = view_json.get('_id')
            view_details = {
                'views': [view_json],
                'navigation': [{'_id': view_id, 'type': 'view'}, ]
            }
            self.create(
                repo_id=repo_id,
                details=json.dumps(view_details)
            )
        else:
            view_details = json.loads(metadata_views.details)
            view_name = get_no_duplicate_obj_name(view_name, metadata_views.view_names)
            exist_view_ids = metadata_views.view_ids
            new_view = RepoView(view_name, view_type, view_data, exist_view_ids)
            view_json = new_view.view_json
            view_id = view_json.get('_id')
            view_details['views'].append(view_json)
            view_details['navigation'].append({'_id': view_id, 'type': 'view'})
            metadata_views.details = json.dumps(view_details)
            metadata_views.save()
        return new_view.view_json

    def list_views(self, repo_id):
        metadata_views = self.filter(repo_id=repo_id).first()
        if not metadata_views:
            return {'views': [], 'navigation': []}
        return json.loads(metadata_views.details)

    def get_view(self, repo_id, view_id):
        metadata_views = self.filter(repo_id=repo_id).first()
        if not metadata_views:
            return None
        view_details = json.loads(metadata_views.details)
        for v in view_details['views']:
            if v.get('_id') == view_id:
                return v

    def update_view(self, repo_id, view_id, view_dict):
        metadata_views = self.filter(repo_id=repo_id).first()
        view_dict.pop('_id', '')
        if 'name' in view_dict:
            exist_obj_names = metadata_views.view_names
            view_dict['name'] = get_no_duplicate_obj_name(view_dict['name'], exist_obj_names)
        view_details = json.loads(metadata_views.details)
        for v in view_details['views']:
            if v.get('_id') == view_id:
                v.update(view_dict)
                break
        metadata_views.details = json.dumps(view_details)
        metadata_views.save()
        return json.loads(metadata_views.details)

    def duplicate_view(self, repo_id, view_id):
        metadata_views = self.filter(repo_id=repo_id).first()
        view_details = json.loads(metadata_views.details)
        exist_view_ids = metadata_views.view_ids
        new_view_id = generate_view_id(4, exist_view_ids)
        duplicate_view = next((copy.deepcopy(view) for view in view_details['views'] if view.get('_id') == view_id), None)
        duplicate_view['_id'] = new_view_id
        view_name = get_no_duplicate_obj_name(duplicate_view['name'], metadata_views.view_names)
        duplicate_view['name'] = view_name
        view_details['views'].append(duplicate_view)
        view_details['navigation'].append({'_id': new_view_id, 'type': 'view'})
        metadata_views.details = json.dumps(view_details)
        metadata_views.save()

        return duplicate_view

    def delete_view(self, repo_id, view_id):
        metadata_views = self.filter(repo_id=repo_id).first()
        view_details = json.loads(metadata_views.details)
        for v in view_details['views']:
            if v.get('_id') == view_id:
                view_details['views'].remove(v)
                break
        for v in view_details['navigation']:
            if v.get('_id') == view_id:
                view_details['navigation'].remove(v)
                break
        metadata_views.details = json.dumps(view_details)
        metadata_views.save()
        return json.loads(metadata_views.details)

    def move_view(self, repo_id, view_id, target_view_id):
        metadata_views = self.filter(repo_id=repo_id).first()
        view_details = json.loads(metadata_views.details)
        view_index = None
        target_index = None
        for i, view in enumerate(view_details['navigation']):
            if view['_id'] == view_id:
                view_index = i
            if view['_id'] == target_view_id:
                target_index = i

        if view_index is not None and target_index is not None:
            if view_index < target_index:
                view_to_move = view_details['navigation'][view_index]
                view_details['navigation'].insert(target_index, view_to_move)
                view_details['navigation'].pop(view_index)
            else:
                view_to_move = view_details['navigation'].pop(view_index)
                view_details['navigation'].insert(target_index, view_to_move)

        metadata_views.details = json.dumps(view_details)
        metadata_views.save()
        return json.loads(metadata_views.details)


class RepoMetadataViews(models.Model):
    repo_id = models.CharField(max_length=36, db_index=True)
    details = models.TextField()

    objects = RepoMetadataViewsManager()

    class Meta:
        db_table = 'repo_metadata_view'

    @property
    def view_ids(self):
        views = json.loads(self.details)['views']
        return [v.get('_id') for v in views]

    @property
    def view_names(self):
        views = json.loads(self.details)['views']
        return [v.get('name') for v in views]
