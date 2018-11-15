import json

from django.core.urlresolvers import reverse

from seahub.drafts.models import Draft, DraftReview, ReviewComment
from seahub.share.utils import share_dir_to_user
from seahub.test_utils import BaseTestCase


class ReviewCommentsViewTest(BaseTestCase):
    def setUp(self):
        self.draft = Draft.objects.add(self.user.username, self.repo, self.file)
        self.review = DraftReview.objects.add(self.user.username, self.draft)
        self.url = reverse('api2-review-comments', args=[self.review.id])
        self.login_as(self.user)

    def test_can_list(self):

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

    def test_can_add(self):

        assert len(ReviewComment.objects.all()) == 0

        resp = self.client.post(self.url, {
                'comment': 'test'
            })

        assert len(ReviewComment.objects.all()) == 1
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['comment'] == 'test'


class ReviewCommentViewTest(BaseTestCase):
    def setUp(self):
        self.draft = Draft.objects.add(self.user.username, self.repo, self.file)
        self.review = DraftReview.objects.add(self.user.username, self.draft)
        self.r_c = ReviewComment.objects.add(comment='review comment', detail='',
                                             author=self.user.username,
                                             review_id=self.review)
        self.url = reverse('api2-review-comment', args=[self.review.id, self.r_c.id])

    def test_delete(self):
        self.login_as(self.user)
        assert len(ReviewComment.objects.all()) == 1
        resp = self.client.delete(self.url)
        assert len(ReviewComment.objects.all()) == 0

    def test_delete_with_r_permission(self):
        share_from = self.user.username
        share_to = self.admin.username
        share_dir_to_user(self.repo, '/', share_from, share_from, share_to, 'r')

        self.login_as(self.admin)

        assert len(ReviewComment.objects.all()) == 1
        resp = self.client.delete(self.url)
        assert len(ReviewComment.objects.all()) == 0
        self.assertEqual(200, resp.status_code)


    def test_delete_with_no_permission(self):
        self.login_as(self.admin)

        assert len(ReviewComment.objects.all()) == 1
        resp = self.client.delete(self.url)
        assert len(ReviewComment.objects.all()) == 1
        self.assertEqual(403, resp.status_code)


    def test_put(self):
        self.login_as(self.user)
        assert self.r_c.resolved is False
        resp = self.client.put(
            self.url,
            'resolved=true',
            'application/x-www-form-urlencoded',
            )
        json_resp = json.loads(resp.content)
        assert json_resp['resolved'] is True
        self.assertEqual(200, resp.status_code)

    def test_put_with_r_permission(self):
        share_from = self.user.username
        share_to = self.admin.username
        share_dir_to_user(self.repo, '/', share_from, share_from, share_to, 'r')

        self.login_as(self.admin)

        assert self.r_c.resolved is False
        resp = self.client.put(
            self.url,
            'resolved=true',
            'application/x-www-form-urlencoded',
            )
        json_resp = json.loads(resp.content)
        assert json_resp['resolved'] is True
        self.assertEqual(200, resp.status_code)

    def test_put_with_no_permission(self):
        self.login_as(self.admin)

        assert self.r_c.resolved is False
        resp = self.client.put(
            self.url,
            'resolved=true',
            'application/x-www-form-urlencoded',
            )
        self.assertEqual(403, resp.status_code)
