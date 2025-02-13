import json
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
        self.management_url = reverse('api-v2.1-metadata')

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
        url = reverse('api-v2.1-metadata-details-settings')
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
        name, furl = self.create_file(repo_id=self.repo_id, parent_dir='/',
                            filename='test.txt', username=self.user.username)
        self.file_name = name
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)
    
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
        
        name, furl = self.create_file(repo_id=self.repo_id, parent_dir='/',
                            filename='test.txt', username=self.user.username)
        self.file_name = name
        url = reverse('api-v2.1-metadata', args=[self.repo_id])
        self.client.put(url)

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
        url = reverse('api-v2.1-metadata-views-detail', args=[self.view_id])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertEqual(json_resp['view']['_id'], self.view_id)

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
        
        url = reverse('api-v2.1-metadata')
        self.client.put(url)
        
        views_url = reverse('api-v2.1-metadata-views')
        resp = self.client.post(views_url, {
            'name': 'test_view',
            'type': 'table'
        }, 'application/json')
        self.view_id = json.loads(resp.content)['view']['_id']

    def test_duplicate_view(self):
        url = reverse('api-v2.1-metadata-view-duplicate')
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

        url = reverse('api-v2.1-metadata')
        self.client.put(url)
        
        views_url = reverse('api-v2.1-metadata-views')
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
        url = reverse('api-v2.1-metadata-views-move')
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
        
        url = reverse('api-v2.1-metadata')
        self.client.put(url)
 
        self.file_name = 'test.txt'
        self.create_file(repo_id=self.repo_id,
                        parent_dir='/',
                        filename=self.file_name,
                        username=self.user.username)

    def test_extract_file_details(self):
        url = reverse('api-v2.1-metadata-extract-file-details')
        
        resp = self.client.get(reverse('api-v2.1-metadata-record-info') + 
                             f'?parent_dir=/&file_name={self.file_name}')
        obj_id = json.loads(resp.content)['_obj_id']
        
        data = {
            'obj_ids': [obj_id]
        }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIn('details', json_resp)

    def test_extract_file_details_with_invalid_obj_ids(self):
        url = reverse('api-v2.1-metadata-extract-file-details')
        data = {
            'obj_ids': []
        }
        resp = self.client.post(url, data, 'application/json')
        self.assertEqual(400, resp.status_code)
