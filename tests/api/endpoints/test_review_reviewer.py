import json

from django.core.urlresolvers import reverse

from seahub.drafts.models import Draft, DraftReview, ReviewReviewer
from seahub.share.utils import share_dir_to_user
from seahub.test_utils import BaseTestCase


class ReviewReviewerViewTest(BaseTestCase):
    def setUp(self):
        self.share_from = self.user.username
        self.share_to = self.admin.username
        share_dir_to_user(self.repo, '/', self.share_from, self.share_from, self.share_to, 'rw')

        self.draft = Draft.objects.add(self.user.username, self.repo, self.file)
        self.review = DraftReview.objects.add(self.user.username, self.draft)
        self.url = reverse('api-v2.1-draft-review-reviewer', args=[self.review.id])
        self.login_as(self.user)

    def test_can_list(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

    def test_can_add(self):
        assert len(ReviewReviewer.objects.all()) == 0

        resp = self.client.post(self.url, {
            'reviewer': ['foo@foo.com', self.share_to]
        })

        json_resp = json.loads(resp.content)
        assert json_resp['failed'][0]['email'] == 'foo@foo.com'
        assert json_resp['success'][0]['user_info']['name'] == self.share_to

        self.assertEqual(200, resp.status_code)

    def test_can_delete(self):
        self.client.post(self.url, {
            'reviewer': [self.share_to]
        })

        assert len(ReviewReviewer.objects.all()) == 1

        url = self.url + '?username=' + self.share_to
        resp = self.client.delete(url)

        self.assertEqual(200, resp.status_code)

        assert len(ReviewReviewer.objects.all()) == 0
