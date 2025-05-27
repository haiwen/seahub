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


def generate_views_unique_id(length, type, folders_views_ids=None):
    if type == 'face_recognition':
        return FACE_RECOGNITION_VIEW_ID

    if not folders_views_ids:
        return generate_random_string_lower_digits(length)

    while True:
        new_id = generate_random_string_lower_digits(length)
        if new_id not in folders_views_ids:
            break

    return new_id


class RepoMetadataManager(models.Manager):

    def enable_metadata_and_tags(self, repo_id):
        metadata = self.filter(repo_id=repo_id).first()
        enabled = True
        from_commit = '0000000000000000000000000000000000000000'
        if not metadata:
            metadata = self.model(repo_id=repo_id, enabled=enabled, tags_enabled=enabled, tags_lang='en', from_commit=from_commit)
        else:
            metadata.enabled = enabled
            metadata.tags_enabled = True
            metadata.tags_lang = 'en'
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
    ocr_enabled = models.BooleanField(db_index=True)

    objects = RepoMetadataManager()

    class Meta:
        db_table = 'repo_metadata'


class RepoFolder(object):

    def __init__(self, name, children=[], folders_views_ids=None):
        self.name = name
        self.type = 'folder'
        self.children = children

        self.init_folder(folders_views_ids)

    def init_folder(self, folders_views_ids=None):
        self.folder_json = {
            "_id": generate_views_unique_id(4, self.type, folders_views_ids),
            "name": self.name,
            "type": self.type,
            "children": self.children
        }


class RepoView(object):

    def __init__(self, name, type='table', view_data={}, folders_views_ids=None):
        self.name = name
        self.type = type
        self.view_data = view_data
        self.view_json = {}

        self.init_view(folders_views_ids)

    def init_view(self, folders_views_ids=None):
        self.view_json = {
            "_id": generate_views_unique_id(4, self.type, folders_views_ids),
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

    def add_folder(self, repo_id, folder_name):
        metadata_views = self.filter(repo_id=repo_id).first()
        if not metadata_views:
            return None

        view_details = json.loads(metadata_views.details)
        navigation = view_details.get('navigation', [])
        exist_folders_views_ids = metadata_views.folders_views_ids
        new_folder = RepoFolder(folder_name, [], exist_folders_views_ids)
        folder_json = new_folder.folder_json
        navigation.append(folder_json)
        metadata_views.details = json.dumps(view_details)
        metadata_views.save()
        return folder_json

    def update_folder(self, repo_id, folder_id, folder_dict):
        metadata_views = self.filter(repo_id=repo_id).first()
        folder_dict.pop('_id', '')
        folder_dict.pop('type', '')
        folder_dict.pop('children', '')
        if 'name' in folder_dict:
            exist_obj_names = metadata_views.folders_names
            folder_dict['name'] = get_no_duplicate_obj_name(folder_dict['name'], exist_obj_names)
        view_details = json.loads(metadata_views.details)
        for folder in view_details['navigation']:
            if folder.get('type', None) == 'folder' and folder.get('_id') == folder_id:
                folder.update(folder_dict)
                break
        metadata_views.details = json.dumps(view_details)
        metadata_views.save()
        return json.loads(metadata_views.details)

    def delete_folder(self, repo_id, folder_id):
        metadata_views = self.filter(repo_id=repo_id).first()
        view_details = json.loads(metadata_views.details)
        navigation = view_details.get('navigation', [])
        views = view_details.get('views', [])
        for folder in navigation:
            if folder.get('_id') == folder_id:
                # add views which in the folder into navigation
                if folder.get('children'):
                    navigation.extend(folder.get('children'))

                # remove folder
                navigation.remove(folder)
                break
        metadata_views.details = json.dumps(view_details)
        metadata_views.save()
        return json.loads(metadata_views.details)

    def add_view(self, repo_id, view_name, view_type='table', view_data={}, folder_id=None):
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
            navigation = view_details.get('navigation', [])
            view_name = get_no_duplicate_obj_name(view_name, metadata_views.views_names)
            exist_folders_views_ids = metadata_views.folders_views_ids
            new_view = RepoView(view_name, view_type, view_data, exist_folders_views_ids)
            view_json = new_view.view_json
            view_id = view_json.get('_id')
            view_details['views'].append(view_json)
            new_view_nav = { '_id': view_id, 'type': 'view' }
            if folder_id:
                folder = next((folder for folder in navigation if folder.get('_id') == folder_id), None)
                if not folder:
                    return None
                folderChildren = folder.get('children', [])
                folderChildren.append(new_view_nav)
            else:
                navigation.append(new_view_nav)
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
            exist_obj_names = metadata_views.views_names
            view_dict['name'] = get_no_duplicate_obj_name(view_dict['name'], exist_obj_names)
        view_details = json.loads(metadata_views.details)
        for v in view_details['views']:
            if v.get('_id') == view_id:
                v.update(view_dict)
                break
        metadata_views.details = json.dumps(view_details)
        metadata_views.save()
        return json.loads(metadata_views.details)

    def duplicate_view(self, repo_id, view_id, folder_id=None):
        metadata_views = self.filter(repo_id=repo_id).first()
        view_details = json.loads(metadata_views.details)
        exist_folders_views_ids = metadata_views.folders_views_ids
        new_view_id = generate_views_unique_id(4, exist_folders_views_ids)
        duplicate_view = next((copy.deepcopy(view) for view in view_details['views'] if view.get('_id') == view_id), None)
        if not duplicate_view:
            return None

        duplicate_view['_id'] = new_view_id
        view_name = get_no_duplicate_obj_name(duplicate_view['name'], metadata_views.views_names)
        duplicate_view['name'] = view_name
        view_details['views'].append(duplicate_view)
        navigation = view_details.get('navigation', [])
        new_view_nav = {'_id': new_view_id, 'type': 'view'}
        if folder_id:
            # add duplicate_view into folder
            folder = next((folder for folder in navigation if folder.get('_id') == folder_id), None)
            if not folder:
                return None
            folderChildren = folder.get('children', [])
            folderChildren.append(new_view_nav)
        else:
            navigation.append(new_view_nav)

        metadata_views.details = json.dumps(view_details)
        metadata_views.save()

        return duplicate_view

    def delete_view(self, repo_id, view_id, folder_id=None):
        metadata_views = self.filter(repo_id=repo_id).first()
        view_details = json.loads(metadata_views.details)
        navigation = view_details.get('navigation', [])
        views = view_details.get('views', [])

        for view in views:
            if view.get('_id') == view_id:
                views.remove(view)
                break
        for nav_item in navigation:
            # delete view from folder
            if folder_id and nav_item.get('_id') == folder_id and nav_item.get('type') == 'folder' and nav_item.get('children'):
                for child in nav_item.get('children'):
                    if child.get('_id') == view_id:
                        nav_item.get('children').remove(child)
                        break
                break

            # delete view not in folders
            if nav_item.get('_id') == view_id:
                navigation.remove(nav_item)
                break

        metadata_views.details = json.dumps(view_details)
        metadata_views.save()
        return json.loads(metadata_views.details)

    def move_view(self, repo_id, source_view_id, source_folder_id, target_view_id, target_folder_id, is_above_folder):
        metadata_views = self.filter(repo_id=repo_id).first()
        view_details = json.loads(metadata_views.details)
        navigation = view_details.get('navigation', [])

        # find drag source
        if source_folder_id:
            if source_view_id:
                # drag view from folder
                dragged_id = source_view_id
                source_folder = next((folder for folder in navigation if folder.get('_id') == source_folder_id), None)
                if source_folder:
                    updated_source_nav_list = source_folder.get('children', [])
            else:
                # drag folder
                dragged_id = source_folder_id
                updated_source_nav_list = navigation
        elif source_view_id:
            # drag view not in folders
            dragged_id = source_view_id
            updated_source_nav_list = navigation

        # invalid drag source
        if not dragged_id or not updated_source_nav_list:
            return None
        drag_source = next((nav for nav in updated_source_nav_list if nav.get('_id') == dragged_id), None)
        if not drag_source:
            return None

        # remove drag source from navigation
        updated_source_nav_list.remove(drag_source)

        # find drop target
        updated_target_nav_list = navigation
        if target_folder_id and source_view_id and not is_above_folder:
            target_folder = next((folder for folder in navigation if folder.get('_id') == target_folder_id), None)
            if target_folder:
                updated_target_nav_list = target_folder.get('children', [])

        # drag source already exist
        exist_drag_source = next((nav for nav in updated_target_nav_list if nav.get('_id') == drag_source.get('_id')), None)
        if exist_drag_source:
            return None

        # drop drag source to the target position
        target_nav = None
        if target_view_id:
            # move folder/view above view
            target_nav = next((nav for nav in updated_target_nav_list if nav.get('_id') == target_view_id), None)
        elif target_folder_id:
            # move folder/view above folder
            target_nav = next((nav for nav in updated_target_nav_list if nav.get('_id') == target_folder_id), None)

        insert_index = -1
        if target_nav:
            insert_index = updated_target_nav_list.index(target_nav)

        if insert_index > -1:
            updated_target_nav_list.insert(insert_index, drag_source)
        else:
            updated_target_nav_list.append(drag_source)

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
    def folders_ids(self):
        metadata_views = json.loads(self.details)
        navigation = metadata_views.get('navigation', [])
        return [folder.get('_id') for folder in navigation if folder.get('type', None) == 'folder']

    @property
    def folders_names(self):
        metadata_views = json.loads(self.details)
        navigation = metadata_views.get('navigation', [])
        return [folder.get('name') for folder in navigation if folder.get('type', None) == 'folder']

    @property
    def views_ids(self):
        views = json.loads(self.details)['views']
        return [v.get('_id') for v in views]

    @property
    def views_names(self):
        views = json.loads(self.details)['views']
        return [v.get('name') for v in views]

    @property
    def folders_views_ids(self):
        return self.folders_ids + self.views_ids
