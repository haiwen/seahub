# -*- coding: utf-8 -*-
import json
import urllib.request, urllib.error, urllib.parse

from django.urls import reverse

from seahub.base.models import UserStarredFiles
from seahub.test_utils import BaseTestCase, Fixtures


class StarredFileTest(BaseTestCase, Fixtures):
    def setUp(self):
        UserStarredFiles(email=self.user.username, org_id=-1,
                         repo_id=self.repo.id, path=self.file,
                         is_dir=False).save()
        self.unicode_file = self.create_file(repo_id=self.repo.id,
                                             parent_dir='/',
                                             filename='März_中文_%2F_FG2_SW#1a.jpg',
                                             username=self.user.username)

    def tearDown(self):
        self.remove_repo()

    def js_encodeURIComponent(self, string):
        return urllib.parse.quote(string.encode('utf-8'), safe='~()*!.\'')

    ########## test cases ##########
    def test_can_list(self):
        self.login_as(self.user)

        resp = self.client.get(reverse('starredfiles'))
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertEqual(1, len(json_resp))

    def test_can_add(self):
        self.login_as(self.user)

        resp = self.client.post(reverse('starredfiles'), {
            'repo_id': self.repo.id,
            'p': self.file
        })
        self.assertEqual(201, resp.status_code)
        self.assertEqual(b'"success"', resp.content)

    def test_cannot_add_random_filename(self):
        self.login_as(self.user)

        resp = self.client.post(reverse('starredfiles'), {
            'repo_id': self.repo.id,
            'p': 'some_random_filename'
        })
        self.assertEqual(404, resp.status_code)

    def test_can_delete(self):
        self.login_as(self.user)

        resp = self.client.delete(reverse('starredfiles') + '?repo_id=' +
                                  self.repo.id + '&p=' + self.file)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(0, len(UserStarredFiles.objects.all()))

    def test_cannot_delete_random_filename(self):
        self.login_as(self.user)

        resp = self.client.delete(reverse('starredfiles') + '?repo_id=' +
                                  self.repo.id + '&p=' + 'some_random_filename')
        self.assertEqual(404, resp.status_code)

    def test_can_add_unicode(self):
        self.login_as(self.user)

        resp = self.client.post(reverse('starredfiles'), {
            'repo_id': self.repo.id,
            'p': self.unicode_file,
        })
        self.assertEqual(201, resp.status_code)
        self.assertEqual(b'"success"', resp.content)
        self.assertEqual(2, len(UserStarredFiles.objects.all()))

    def test_can_delete_unicode(self):
        self.login_as(self.user)

        resp = self.client.post(reverse('starredfiles'), {
            'repo_id': self.repo.id,
            'p': self.unicode_file,
        })
        self.assertEqual(201, resp.status_code)
        self.assertEqual(2, len(UserStarredFiles.objects.all()))

        resp = self.client.delete(reverse('starredfiles') + '?repo_id=' +
                                  self.repo.id + '&p=' +
                                  urllib.parse.quote(self.unicode_file.encode('utf-8')))
        self.assertEqual(200, resp.status_code)
        self.assertEqual(1, len(UserStarredFiles.objects.all()))
