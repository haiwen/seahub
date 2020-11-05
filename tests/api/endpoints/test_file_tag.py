#coding:utf-8
import os
import json

from django.urls import reverse
from django.test.client import encode_multipart

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
            name='test-repo', desc='', username=self.user.username,
            passwd=None))
        self.endpoint = reverse('api-v2.1-filetags-view', args=[self.new_repo.id])
        self._endpoint = reverse('api-v2.1-filetag-view', args=[self.new_repo.id, 'test_tagname'])

        self.test_file = self.create_file( repo_id=self.new_repo.id,
                parent_dir=self.test_parentpath, filename=self.test_filename,
                username=self.user.username
                )
        self.test_folder = self.create_folder(repo_id = self.new_repo.id,
                parent_dir=self.test_parentpath, dirname=self.test_folder_name,
                username=self.user.username)

    def test_default(self):
        #test for create file
        response = self.client.post(self.endpoint, { 'path': self.test_filepath, 
                'names': 'test_tagname', 'is_dir': False,
                })
        assert response.status_code == 200
        self.filetag_id = response.data['tags'][0]['id']
        self.filetag_name = response.data['tags'][0]['name']
        self.filetag_username = response.data['tags'][0]['creator']
        assert self.filetag_id
        assert self.filetag_name
        assert self.filetag_username

        #test for create folder
        folder_response = self.client.post(self.endpoint, {
                'path': self.test_folderpath, 'names': 'test_tagname',
                'is_dir': True,
                })
        assert folder_response.status_code == 200
        self.foldertag_id = folder_response.data["tags"][0]['id']
        self.foldertag_name = folder_response.data["tags"][0]['name']
        self.foldertag_username = folder_response.data["tags"][0]['creator']
        assert self.foldertag_id
        assert self.foldertag_name
        assert self.foldertag_username

        #test for get file tag
        response = self.client.get(self.endpoint, {
                'path': self.test_filepath,
                'is_dir': False,
                })
        assert response.status_code == 200
        assert response.data['tags'][0]['id'] == self.filetag_id
        assert response.data['tags'][0]['name'] == self.filetag_name
        assert response.data['tags'][0]['creator'] == self.filetag_username

        #test for get folder tag
        response = self.client.get(self.endpoint, {
                'path': self.test_folderpath,
                'is_dir': True,
                })
        assert response.status_code == 200
        assert response.data['tags'][0]['id'] == self.foldertag_id
        assert response.data['tags'][0]['name'] == self.foldertag_name
        assert response.data['tags'][0]['creator'] == self.foldertag_username

        #test for del file tag
        response = self.client.delete(self._endpoint + "?path=%s&is_dir=%s"
                                      %(self.test_filepath, False))
        assert response.status_code == 200
        response = self.client.get(self.endpoint, {
                'path': self.test_filepath,
                'is_dir': False,
        })
        assert len(response.data['tags']) == 0
        #test for del folder tag
        response = self.client.delete(self._endpoint + "?path=%s&is_dir=%s"
                                      %(self.test_folderpath, True))
        assert response.status_code == 200
        response = self.client.get(self.endpoint, {
                'path': self.test_folderpath,
                'is_dir': True,
        })
        assert len(response.data['tags']) == 0

    def test_post(self):
        # add one
        response = self.client.post(self.endpoint, {
                'path': self.test_filepath, 'names': 'test_tagname',
                'is_dir': False,
        })
        assert response.status_code == 200
        assert response.data["tags"][0]["id"]
        assert response.data["tags"][0]["name"] == "test_tagname"
        assert response.data["tags"][0]["creator"] == self.user.username
        # add more
        response = self.client.post(self.endpoint, {
                'path': self.test_filepath,
                'names': 'test_tagname, test_tagname1, test_tagnm天',
                'is_dir': False,
        })
        assert response.status_code == 200

        assert response.data["tags"][0]["id"]
        tags_names = [tags["name"] for tags in response.data["tags"]]
        assert "test_tagname" in tags_names
        assert "test_tagname1" in tags_names
        assert "test_tagnm天" in tags_names
        assert response.data["tags"][0]["creator"] == self.user.username
        response = self.client.get(self.endpoint, {
                'path': self.test_filepath,
                'is_dir': False,
        })
        tags_names = [tags["name"] for tags in response.data["tags"]]
        assert "test_tagname" in tags_names
        assert "test_tagname1" in tags_names
        assert "test_tagnm天" in tags_names
        #test delete all filetag and add specifiy tag
        data = 'names=test_zm-.&path=%s&is_dir=%s' % (self.test_filepath, False)
        response = self.client.put(self.endpoint, data, 'application/x-www-form-urlencoded')
        assert response.status_code == 200
        response = self.client.get(self.endpoint, { 'path': self.test_filepath,
                'is_dir': False,
        })
        tags_names = [tags["name"] for tags in response.data["tags"]]
        assert "test_tagname" not in tags_names
        assert "test_tagname1" not in tags_names
        assert "test_tagnm" not in tags_names
        assert "test_zm-." in tags_names
        #delete delete all filetag 
        data = 'names=&path=%s&is_dir=%s' % (self.test_filepath, False)
        response = self.client.put(self.endpoint, data, 'application/x-www-form-urlencoded')
        tags_names = [tags["name"] for tags in response.data["tags"]]
        assert response.status_code == 200
        assert "test_zm" not in tags_names
