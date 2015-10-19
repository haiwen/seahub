# -*- coding: utf-8 -*-
import os

from django.test import TestCase
from django.core.urlresolvers import reverse
import requests

from seahub.share.models import FileShare
from seahub.test_utils import Fixtures, BaseTestCase

class ListSharedLinksTest(BaseTestCase):
    def setUp(self):
        share_file_info = {
            'username': 'test@test.com',
            'repo_id': self.repo.id,
            'path': self.file,
            'password': None,
            'expire_date': None,
        }
        self.fs = FileShare.objects.create_file_link(**share_file_info)

    def tearDown(self):
        self.remove_repo()

    def test_can_render(self):
        self.login_as(self.user)

        resp = self.client.get(reverse('list_shared_links'))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share/links.html')

    def test_can_render_when_parent_dir_of_link_is_removed(self):
        """Issue https://github.com/haiwen/seafile/issues/1283
        """
        # create a file in a folder
        self.create_file(repo_id=self.repo.id,
                         parent_dir=self.folder,
                         filename='file.txt',
                         username=self.user.username)
        # share that file
        share_file_info = {
            'username': self.user.username,
            'repo_id': self.repo.id,
            'path': os.path.join(self.folder, 'file.txt'),
            'password': None,
            'expire_date': None,
        }
        fs = FileShare.objects.create_file_link(**share_file_info)

        self.login_as(self.user)

        resp = self.client.get(reverse('list_shared_links'))
        self.assertEqual(200, resp.status_code)

        # then delete parent folder, see whether it raises error
        self.remove_folder()
        resp = self.client.get(reverse('list_shared_links'))
        self.assertEqual(200, resp.status_code)
