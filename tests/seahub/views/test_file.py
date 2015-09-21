import os

from django.core.urlresolvers import reverse
from django.test import TestCase
import requests

from seahub.test_utils import BaseTestCase

class FileTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.video = self.create_file(repo_id=self.repo.id,
                                      parent_dir='/',
                                      filename='test.mp4',
                                      username=self.user.username)
        self.audio = self.create_file(repo_id=self.repo.id,
                                      parent_dir='/',
                                      filename='test.mp3',
                                      username=self.user.username)
        self.image = self.create_file(repo_id=self.repo.id,
                                      parent_dir='/',
                                      filename='test.jpg',
                                      username=self.user.username)
        self.doc = self.create_file(repo_id=self.repo.id,
                                    parent_dir='/',
                                    filename='test.doc',
                                    username=self.user.username)
        self.open_doc = self.create_file(repo_id=self.repo.id,
                                         parent_dir='/',
                                         filename='test.odt',
                                         username=self.user.username)
        self.spreadsheet = self.create_file(repo_id=self.repo.id,
                                            parent_dir='/',
                                            filename='test.xls',
                                            username=self.user.username)
        self.pdf = self.create_file(repo_id=self.repo.id,
                                    parent_dir='/',
                                    filename='test.pdf',
                                    username=self.user.username)
        self.unsupported = self.create_file(repo_id=self.repo.id,
                                            parent_dir='/',
                                            filename='test.xxxx',
                                            username=self.user.username)

    def tearDown(self):
        self.remove_repo()

    def test_can_render(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.file]))
        self.assertEqual(200, resp.status_code)

    def test_can_download(self):
        dl_url = reverse('view_lib_file', args=[self.repo.id, self.file]) + '?dl=1'
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/files/' in resp.get('location')

    def test_can_render_video(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.video]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_audio(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.audio]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_image(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.image]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_doc(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.doc]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_open_doc(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.open_doc]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_spreadsheet(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.spreadsheet]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_pdf(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.pdf]))
        self.assertEqual(200, resp.status_code)

    def test_can_render_unsupported(self):
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id, self.unsupported]))
        self.assertEqual(200, resp.status_code)
