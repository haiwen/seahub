import json

from django.core.urlresolvers import reverse

from seahub.drafts.models import Draft, DraftReview
from seahub.share.utils import share_dir_to_user
from seahub.test_utils import BaseTestCase


class DraftReviewsViewTest(BaseTestCase):
    def setUp(self):
        self.draft = Draft.objects.add(self.user.username, self.repo, self.file)
        self.url = reverse('api-v2.1-draft-reviews')

    def test_can_list(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

    def test_can_add(self):
        self.login_as(self.user)
        assert len(DraftReview.objects.all()) == 0
        resp = self.client.post(self.url, {
            'draft_id': self.draft.id,
        })
        self.assertEqual(200, resp.status_code)
        assert len(DraftReview.objects.all()) == 1

    def test_add_with_no_permission(self):
        self.login_as(self.admin)
        assert len(DraftReview.objects.all()) == 0
        resp = self.client.post(self.url, {
            'draft_id': self.draft.id,
        })
        self.assertEqual(403, resp.status_code)
        assert len(DraftReview.objects.all()) == 0


class DraftReviewViewTest(BaseTestCase):
    def setUp(self):
        self.draft = Draft.objects.add(self.user.username, self.repo, self.file)
        self.review = DraftReview.objects.add(self.user.username, self.draft)
        self.url = reverse('api-v2.1-draft-review', args=[self.review.id])

    def test_can_close(self):
        self.login_as(self.user)
        resp = self.client.put(
            self.url,
            'status=closed',
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['status'] == 'closed'

    def test_close_with_no_permission(self):
        self.login_as(self.admin)
        resp = self.client.put(
            self.url,
            'status=closed',
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(403, resp.status_code)

    def test_publish_with_rw_permission(self):
        self.login_as(self.user)
        assert len(Draft.objects.all()) == 1

        resp = self.client.put(
            self.url,
            'status=finished',
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)

        assert len(Draft.objects.all()) == 0
        json_resp = json.loads(resp.content)

        assert json_resp['status'] == 'finished'

    def test_publish_with_r_permission(self):

        share_from = self.user.username
        share_to = self.admin.username
        share_dir_to_user(self.repo, '/', share_from, share_from, share_to, 'r')

        self.login_as(self.admin)
        assert len(Draft.objects.all()) == 1

        resp = self.client.put(
            self.url,
            'status=finished',
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(403, resp.status_code)

        assert len(Draft.objects.all()) == 1

    def test_publish_with_no_permission(self):
        self.login_as(self.admin)
        assert len(Draft.objects.all()) == 1

        resp = self.client.put(
            self.url,
            'status=finished',
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(403, resp.status_code)

        assert len(Draft.objects.all()) == 1
