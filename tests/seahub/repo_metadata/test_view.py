import os
import json
import time
from django.urls import reverse

from seahub.repo_metadata.models import RepoMetadata, RepoMetadataViews
from seahub.test_utils import BaseTestCase

from seaserv import seafile_api


class MetadataManagerTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None))
        self.repo_id = self.repo.id
        self.management_url = reverse('api-v2.1-metadata', args=[self.repo_id])

    def test_get_metadata_manage(self):
        resp = self.client.get(self.management_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertFalse(json_resp['enabled'])
    
    def test_put_metadata_manage(self):
        resp = self.client.put(self.management_url)
        self.assertEqual(200, resp.status_code)

        metadata = RepoMetadata.objects.get(repo_id=self.repo_id)
        self.assertTrue(metadata.enabled)

    def test_delete_metadata_manage(self):
        self.client.put(self.management_url)
        resp = self.client.delete(self.management_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])

        metadata = RepoMetadata.objects.get(repo_id=self.repo_id)
        self.assertFalse(metadata.enabled)


class MetadataDetailSettingsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
    
    def test_put_details_settings(self):
        url = reverse('api-v2.1-metadata-details-settings', args=[self.repo_id])
        settings = {'test_key': 'test_value'}
        resp = self.client.put(url, {
            'settings': settings
        }, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])

        metadata = RepoMetadata.objects.get(repo_id=self.repo_id)
        saved_settings = json.loads(metadata.details_settings)
        self.assertEqual(saved_settings['test_key'], 'test_value')


class MetadataRecordsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        
        resp = self.client.get(reverse('api-v2.1-metadata-views', args=[self.repo_id]))
        self.view_id = json.loads(resp.content)['navigation'][0]['_id']

    def test_get_records(self):
        url = reverse('api-v2.1-metadata-records', args=[self.repo_id])
        resp = self.client.get(url + f'?view_id={self.view_id}')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('results', json_resp)
        self.assertIn('metadata', json_resp)

    def test_put_records(self):
        url = reverse('api-v2.1-metadata-records', args=[self.repo_id])
        records_data = {
            'records_data': [{
                'record_id': 'test_id',
                'record': {'test_field': 'test_value'}
            }]
        }
        resp = self.client.put(url, records_data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])


class MetadataRecordTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        file_path = self.create_file(repo_id=self.repo_id, parent_dir='/',
            filename='test.txt', username=self.user.username)
        self.file_name = os.path.basename(file_path)

        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        time.sleep(0.2)
    
    def test_get_record(self):
        url = reverse('api-v2.1-metadata-record-info', args=[self.repo_id])
        resp = self.client.get(url + f'?parent_dir=/&file_name={self.file_name}')
        self.assertEqual(200, resp.status_code)
   
    def test_put_record(self):
        url = reverse('api-v2.1-metadata-record-info', args=[self.repo_id])
        data = {
            'parent_dir': '/',
            'file_name': self.file_name,
            'data': {'test_field': 'test_value'}
        }
        resp = self.client.put(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])


class MetadataColumnsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        file_path = self.create_file(repo_id=self.repo_id, parent_dir='/',
                            filename='test.txt', username=self.user.username)
        self.file_name = os.path.basename(file_path)
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        time.sleep(0.2)

    def test_post_column(self):
        url = reverse('api-v2.1-metadata-columns', args=[self.repo_id])
        data = {
            'column_name': 'test_column',
            'column_type': 'text'
        }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('column', json_resp)

    def test_put_column(self):
        url = reverse('api-v2.1-metadata-columns', args=[self.repo_id])
        self.client.post(url, {
            'column_name': 'test_column',
            'column_type': 'text',
            'column_key': 'test_key',
        }, 'application/json')

        data = {
            'column_key': 'test_key',
            'name': 'new_name'
        }
        resp = self.client.put(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('column', json_resp)

    def test_delete_column(self):
        url = reverse('api-v2.1-metadata-columns', args=[self.repo_id])
        resp = self.client.post(url, {
            'column_name': 'test_column',
            'column_type': 'text'
        }, 'application/json')
        column_key = json.loads(resp.content)['column']['key']
        
        resp = self.client.delete(url, {
            'column_key': column_key
        }, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])


class MetadataViewsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)

    def test_get_views(self):
        url = reverse('api-v2.1-metadata-views', args=[self.repo_id])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('navigation', json_resp)
        self.assertTrue(len(json_resp['navigation']) > 0)

    def test_create_view(self):
        url = reverse('api-v2.1-metadata-views', args=[self.repo_id])
        data = {
            'name': 'test_view',
            'type': 'table'
        }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('view', json_resp)
        self.assertEqual(json_resp['view']['name'], 'test_view')
    
    def test_get_view_detail(self):
        url = reverse('api-v2.1-metadata-views', args=[self.repo_id])
        resp = self.client.post(url, {
            'name': 'test_view',
            'type': 'table'
        }, 'application/json')
        view_id = json.loads(resp.content)['view']['_id']

        url = reverse('api-v2.1-metadata-views-detail', args=[self.repo_id, view_id])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertEqual(json_resp['view']['_id'], view_id)

    def test_put_view(self):
        url = reverse('api-v2.1-metadata-views', args=[self.repo_id])
        resp = self.client.post(url, {
            'name': 'test_view',
            'type': 'table'
        }, 'application/json')
        view_id = json.loads(resp.content)['view']['_id']
        
        data = {
            'view_id': view_id,
            'view_data': {'name': 'new_name'}
        }
        resp = self.client.put(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])

    def test_delete_view(self):
        url = reverse('api-v2.1-metadata-views', args=[self.repo_id])
        resp = self.client.post(url, {
            'name': 'test_view',
            'type': 'table'
        }, 'application/json')
        view_id = json.loads(resp.content)['view']['_id']
        
        resp = self.client.delete(url, {
            'view_id': view_id
        }, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])


class MetadataViewsDuplicateViewTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        
        views_url = reverse('api-v2.1-metadata-views', args=[self.repo_id])
        resp = self.client.post(views_url, {
            'name': 'test_view',
            'type': 'table'
        }, 'application/json')
        self.view_id = json.loads(resp.content)['view']['_id']

    def test_duplicate_view(self):
        url = reverse('api-v2.1-metadata-view-duplicate', args=[self.repo_id])
        data = {
            'view_id': self.view_id
        }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('view', json_resp)
        self.assertNotEqual(json_resp['view']['_id'], self.view_id)
        self.assertTrue(json_resp['view']['name'].startswith('test_view'))


class MetadataViewsMoveViewTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id

        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        
        views_url = reverse('api-v2.1-metadata-views', args=[self.repo_id])
        resp = self.client.post(views_url, {
            'name': 'source_view',
            'type': 'table'
        }, 'application/json')
        self.source_view_id = json.loads(resp.content)['view']['_id']
        
        resp = self.client.post(views_url, {
            'name': 'target_view',
            'type': 'table'
        }, 'application/json')
        self.target_view_id = json.loads(resp.content)['view']['_id']

    def test_move_view(self):
        url = reverse('api-v2.1-metadata-views-move', args=[self.repo_id])
        data = {
            'source_view_id': self.source_view_id,
            'target_view_id': self.target_view_id
        }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('navigation', json_resp)


class MetadataExtractFileDetailsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        self.file_name = 'test.txt'
        self.create_file(repo_id=self.repo_id,
                        parent_dir='/',
                        filename=self.file_name,
                        username=self.user.username)
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        time.sleep(0.2)

    def test_extract_file_details(self):
        url = reverse('api-v2.1-metadata-extract-file-details', args=[self.repo_id])
        
        resp = self.client.get(reverse('api-v2.1-metadata-record-info', args=[self.repo_id]) + 
                             f'?parent_dir=/&file_name={self.file_name}')
        obj_id = json.loads(resp.content)['results'][0]['_obj_id']
        
        data = {
            'obj_ids': [obj_id]
        }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('details', json_resp)

    def test_extract_file_details_with_invalid_obj_ids(self):
        url = reverse('api-v2.1-metadata-extract-file-details', args=[self.repo_id])
        data = {
            'obj_ids': []
        }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(400, resp.status_code)


class MetadataFoldersTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)

    def test_create_metadata_folders(self):
        url = reverse('api-v2.1-metadata-folders', args=[self.repo_id])
        data = {'name': 'test_folder'}
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('folder', json_resp)

    def test_put_folder(self):
        url = reverse('api-v2.1-metadata-folders', args=[self.repo_id])
        resp = self.client.post(url, {'name': 'test_folder'}, 'application/json')
        folder_id = json.loads(resp.content)['folder']['_id']
        
        data = {
            'folder_id': folder_id,
            'folder_data': {'name': 'new_name'}
        }
        resp = self.client.put(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])

    def test_delete_folder(self):
        url = reverse('api-v2.1-metadata-folders', args=[self.repo_id])
        resp = self.client.post(url, {'name': 'test_folder'}, 'application/json')
        folder_id = json.loads(resp.content)['folder']['_id']

        data = {'folder_id': folder_id}
        resp = self.client.delete(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])


class FacesRecordsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        url = reverse('api-v2.1-metadata-face-recognition', args=[self.repo_id])
        self.client.post(url)

    def test_get_face_records(self):
        url = reverse('api-v2.1-metadata-face-records', args=[self.repo_id])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('metadata', json_resp)
        self.assertIn('results', json_resp)


class FaceRecognitionManageTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)

    def test_enable_face_recognition(self):
        url = reverse('api-v2.1-metadata-face-recognition', args=[self.repo_id])
        resp = self.client.post(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('task_id', json_resp)
        metadata = RepoMetadata.objects.filter(repo_id=self.repo_id).first()
        face_recognition_status = metadata.face_recognition_enabled
        self.assertEqual(1, face_recognition_status)

    def test_disable_face_recognition(self):
        url = reverse('api-v2.1-metadata-face-recognition', args=[self.repo_id])
        self.client.post(url)

        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])
        metadata = RepoMetadata.objects.filter(repo_id=self.repo_id).first()
        face_recognition_status = metadata.face_recognition_enabled
        self.assertEqual(0, face_recognition_status)


class MetadataTagsStatusManageTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)

    def test_enable_tags(self):
        url = reverse('api-v2.1-metadata-tags-status', args=[self.repo_id])
        data = {
            'lang': 'en'
        }
        resp = self.client.put(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])
        metadata = RepoMetadata.objects.filter(repo_id=self.repo_id).first()
        self.assertEqual(1, metadata.tags_enabled)
        self.assertEqual('en', metadata.tags_lang)

    def test_disable_tags(self):
        url = reverse('api-v2.1-metadata-tags-status', args=[self.repo_id])
        self.client.put(url, {'lang': 'en'}, 'application/json')
        
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])
        metadata = RepoMetadata.objects.filter(repo_id=self.repo_id).first()
        self.assertEqual(0, metadata.tags_enabled)


class MetadataTagsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        url = reverse('api-v2.1-metadata-tags-status', args=[self.repo_id])
        self.client.put(url, {'lang': 'en'}, 'application/json')

    def test_create_and_get_tags(self):
        url = reverse('api-v2.1-metadata-tags', args=[self.repo_id])
        tag_name = 'test_tag'
        data = {
                "tags_data": [
                    {
                        "_tag_color": "#FFFCB5",
                        "_tag_name": tag_name
                    }
                ]
            }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('tags', json_resp)
        self.assertEqual(tag_name, json_resp['tags'][0].get('_tag_name'))

        url = reverse('api-v2.1-metadata-tags', args=[self.repo_id])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertEqual(1, len(json_resp['results']))

    def test_update_and_delete_tags(self):
        # add tag
        url = reverse('api-v2.1-metadata-tags', args=[self.repo_id])
        tag_name = 'test_tag'
        data = {
                "tags_data": [
                    {
                        "_tag_color": "#FFFCB5",
                        "_tag_name": tag_name
                    }
                ]
            }
        resp = self.client.post(url, data, 'application/json')
        json_resp = json.loads(resp.content)

        # update tag
        tag_id = json_resp['tags'][0].get('_id')
        data = {
                "tags_data": [
                    {
                        "tag_id": tag_id,
                        "tag": {
                            "_tag_color": "#FFFCB5",
                            "_tag_name": "new_tag"
                        }
                    }
                ]
            }
        resp = self.client.put(url, data, 'application/json')
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])

        # delete tag
        data = {
            "tag_ids": [
                tag_id
            ]
        }
        resp = self.client.delete(url, data, 'application/json')
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])


class MetadataTagsLinksTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        
        url = reverse('api-v2.1-metadata-tags-status', args=[self.repo_id])
        self.client.put(url, {'lang': 'en'}, 'application/json')

        url = reverse('api-v2.1-metadata-tags', args=[self.repo_id])
        data = {
            "tags_data": [
                {
                    "_tag_color": "#FFFCB5",
                    "_tag_name": "parent_tag"
                },
                {
                    "_tag_color": "#FFFCB5", 
                    "_tag_name": "child_tag"
                }
            ]
        }
        resp = self.client.post(url, data, 'application/json')
        tags = json.loads(resp.content)['tags']
        self.parent_tag_id = tags[0]['_id']
        self.child_tag_id = tags[1]['_id']

    def test_create_parent_child_link(self):
        url = reverse('api-v2.1-metadata-tags-links', args=[self.repo_id])
        data = {
            'link_column_key': '_tag_sub_links',
            'row_id_map': {
                self.parent_tag_id: [self.child_tag_id]
            }
        }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])
    
    def test_update_parent_child_link(self):
        url = reverse('api-v2.1-metadata-tags-links', args=[self.repo_id])
        
        data = {
            'link_column_key': '_tag_sub_links',
            'row_id_map': {
                self.parent_tag_id: [self.child_tag_id]
            }
        }
        self.client.post(url, data, 'application/json')
        
        data = {
            'link_column_key': '_tag_sub_links',
            'row_id_map': {
                self.parent_tag_id: [] 
            }
        }
        resp = self.client.put(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])
    
    def test_delete_parent_child_link(self):
        url = reverse('api-v2.1-metadata-tags-links', args=[self.repo_id])
        data = {
            'link_column_key': '_tag_sub_links',
            'row_id_map': {
                self.parent_tag_id: [self.child_tag_id]
            }
        }
        self.client.post(url, data, 'application/json')
        data = {
            'link_column_key': '_tag_sub_links',
            'row_id_map': {
                self.parent_tag_id: [self.child_tag_id]
            }
        }
        resp = self.client.delete(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])


class MetadataFileTagsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id

        self.file_name = 'test.txt'
        self.create_file(repo_id=self.repo_id,
                        parent_dir='/',
                        filename=self.file_name,
                        username=self.user.username)
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        time.sleep(0.2)

        url = reverse('api-v2.1-metadata-tags-status', args=[self.repo_id])
        self.client.put(url, {'lang': 'en'}, 'application/json')

        url = reverse('api-v2.1-metadata-tags', args=[self.repo_id])
        data = {
            "tags_data": [
                {
                    "_tag_color": "#FFFCB5",
                    "_tag_name": "test_tag"
                }
            ]
        }
        resp = self.client.post(url, data, 'application/json')
        self.tag = json.loads(resp.content)['tags'][0]

        resp = self.client.get(reverse('api-v2.1-metadata-record-info', args=[self.repo_id]) + 
                             f'?parent_dir=/&file_name={self.file_name}')
        self.record_id = json.loads(resp.content)['results'][0]['_id']

    def test_update_file_tags(self):
        url = reverse('api-v2.1-metadata-file-tags', args=[self.repo_id])
        data = {
            'file_tags_data': [{
                'record_id': self.record_id,
                'tags': [self.tag['_id']]
            }]
        }
        resp = self.client.put(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertEqual([self.record_id], json_resp['success'])
        self.assertEqual([], json_resp['fail'])


class MetadataTagFilesTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        self.file_name = 'test.txt'
        self.create_file(repo_id=self.repo_id,
                        parent_dir='/',
                        filename=self.file_name,
                        username=self.user.username)
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
        
        url = reverse('api-v2.1-metadata-tags-status', args=[self.repo_id])
        self.client.put(url, {'lang': 'en'}, 'application/json')

        url = reverse('api-v2.1-metadata-tags', args=[self.repo_id])
        data = {
            "tags_data": [
                {
                    "_tag_color": "#FFFCB5",
                    "_tag_name": "test_tag"
                }
            ]
        }
        resp = self.client.post(url, data, 'application/json')
        self.tag = json.loads(resp.content)['tags'][0]
        resp = self.client.get(reverse('api-v2.1-metadata-record-info', args=[self.repo_id]) + 
                             f'?parent_dir=/&file_name={self.file_name}')
        if resp.status_code != 200:
            time.sleep(0.2)
            resp = self.client.get(reverse('api-v2.1-metadata-record-info', args=[self.repo_id]) + 
                             f'?parent_dir=/&file_name={self.file_name}')
        self.record_id = json.loads(resp.content)['results'][0]['_id']
        
        url = reverse('api-v2.1-metadata-file-tags', args=[self.repo_id])
        data = {
            'file_tags_data': [{
                'record_id': self.record_id,
                'tags': [self.tag['_id']]
            }]
        }
        self.client.put(url, data, 'application/json')

    def test_get_tag_files(self):
        url = reverse('api-v2.1-metadata-tag-files', args=[self.repo_id, self.tag['_id']])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertEqual(1, len(json_resp['results']))
        self.assertEqual(self.file_name, json_resp['results'][0]['_name'])
    

class MetadataMergeTagsTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None
        ))
        self.repo_id = self.repo.id
        
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)

        url = reverse('api-v2.1-metadata-tags-status', args=[self.repo_id])
        self.client.put(url, {'lang': 'en'}, 'application/json')

        url = reverse('api-v2.1-metadata-tags', args=[self.repo_id])
        data = {
            "tags_data": [
                {
                    "_tag_color": "#FFFCB5",
                    "_tag_name": "target_tag"
                },
                {
                    "_tag_color": "#FFFCB5",
                    "_tag_name": "merge_tag"
                }
            ]
        }
        resp = self.client.post(url, data, 'application/json')
        tags = json.loads(resp.content)['tags']
        self.target_tag_id = tags[0]['_id']
        self.merge_tag_id = tags[1]['_id']

    def test_merge_tags(self):
        url = reverse('api-v2.1-metadata-merge-tags', args=[self.repo_id])
        data = {
            'target_tag_id': self.target_tag_id,
            'merged_tags_ids': [self.merge_tag_id]
        }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertTrue(json_resp['success'])

        url = reverse('api-v2.1-metadata-tags', args=[self.repo_id])
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        tag_ids = [tag['_id'] for tag in json_resp['results']]
        self.assertIn(self.target_tag_id, tag_ids)
        self.assertNotIn(self.merge_tag_id, tag_ids)

