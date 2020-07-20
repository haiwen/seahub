import json

from django.urls import reverse

from seaserv import seafile_api
from seahub.drafts.models import Draft
from seahub.test_utils import BaseTestCase


class DraftsViewTest(BaseTestCase):
    def setUp(self):
        self.url = reverse('api-v2.1-drafts')
        self.login_as(self.user)

    def test_can_list(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

    def test_can_create(self):
        assert len(Draft.objects.all()) == 0

        resp = self.client.post(self.url, {
            'repo_id': self.repo.id,
            'file_path': self.file,
        })

        self.assertEqual(200, resp.status_code)
        assert len(Draft.objects.all()) == 1

        json_resp = json.loads(resp.content)
        assert json_resp['owner'] == self.user.username
        assert json_resp['origin_repo_id'] == self.repo.id

    def test_create_same_file(self):
        resp = self.client.post(self.url, {
            'repo_id': self.repo.id,
            'file_path': self.file,
        })

        self.assertEqual(200, resp.status_code)

        resp = self.client.post(self.url, {
            'repo_id': self.repo.id,
            'file_path': self.file,
        })

        self.assertEqual(409, resp.status_code)


class DraftViewTest(BaseTestCase):
    def setUp(self):
        seafile_api.post_dir(self.repo.id, '/', 'Drafts', self.user.username)
        draft = Draft.objects.add(self.user.username, self.repo, self.file)
        self.url = reverse('api-v2.1-draft', args=[draft.id])

        self.login_as(self.user)

    def test_can_delete(self):
        assert len(Draft.objects.all()) == 1

        resp = self.client.delete(self.url)
        self.assertEqual(200, resp.status_code)

        assert len(Draft.objects.all()) == 0

    def test_can_publish(self):
        assert len(Draft.objects.all()) == 1

        resp = self.client.put(
            self.url,
            'operation=publish',
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)

        assert len(Draft.objects.all()) == 1
