import os
import json

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seaserv import seafile_api
class FileTagTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

        self.test_filepath ='/test_file.txt'
        self.test_folderpath = '/test_folder'
        self.test_parentpath = '/'
        self.test_filename = 'test_file.txt'
        self.test_folder_name = 'test_folder'
        self.new_repo = seafile_api.get_repo(self.create_repo(
            name='test-repo',
            desc='',
            username=self.user.username,
            passwd=None))
        self.endpoint = reverse('api-v2.1-filetags-view', args=[self.new_repo.id])
        self._endpoint = reverse('api-v2.1-filetag-view', args=[self.new_repo.id, 'test_tagname'])

        self.test_file = self.create_file( repo_id=self.new_repo.id,
                parent_dir=self.test_parentpath,
                filename=self.test_filename,
                username=self.user.username
                )
        self.test_folder = self.create_folder(repo_id = self.new_repo.id,
                parent_dir=self.test_parentpath,
                dirname=self.test_folder_name,
                username=self.user.username)

    def test_default(self):
        #test for create file
        response = self.client.post(self.endpoint, {
                'p': self.test_filepath,
                'name': 'test_tagname',
                'is_dir': False,
                })
        assert response.status_code in [200, 201]
        self.filetag_id = response.data['id']
        self.filetag_name = response.data['name']
        self.filetag_username = response.data['creator']
        assert self.filetag_id
        assert self.filetag_name
        assert self.filetag_username

        #test for create folder
        folder_response = self.client.post(self.endpoint, {
                'p': self.test_folderpath,
                'name': 'test_tagname',
                'is_dir': True,
                })
        assert folder_response.status_code in [200, 201]
        self.foldertag_id = folder_response.data['id']
        self.foldertag_name = folder_response.data['name']
        self.foldertag_username = folder_response.data['creator']
        assert self.foldertag_id
        assert self.foldertag_name
        assert self.foldertag_username

        #test for get file tag
        response = self.client.get(self.endpoint, {
                'p': self.test_filepath,
                'is_dir': False,
                })
        assert response.status_code == 200
        assert response.data['tags'][0]['id'] == self.filetag_id
        assert response.data['tags'][0]['name'] == self.filetag_name
        assert response.data['tags'][0]['creator'] == self.filetag_username

        #test for get folder tag
        response = self.client.get(self.endpoint, {
                'p': self.test_folderpath,
                'is_dir': True,
                })
        assert response.status_code == 200
        assert response.data['tags'][0]['id'] == self.foldertag_id
        assert response.data['tags'][0]['name'] == self.foldertag_name
        assert response.data['tags'][0]['creator'] == self.foldertag_username

        #test for del file tag
        response = self.client.delete(self._endpoint + "?p=%s&is_dir=%s"
                                      %(self.test_filepath, False))
        assert response.status_code == 200
        response = self.client.get(self.endpoint, {
                'p': self.test_filepath,
                'is_dir': False,
                })
        assert len(response.data['tags']) == 0
        #test for del folder tag
        response = self.client.delete(self._endpoint + "?p=%s&is_dir=%s"
                                      %(self.test_folderpath, True))
        assert response.status_code == 200
        response = self.client.get(self.endpoint, {
                'p': self.test_folderpath,
                'is_dir': True,
                })
        assert len(response.data['tags']) == 0
