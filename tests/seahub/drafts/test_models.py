from django.core.urlresolvers import reverse
from seahub.drafts.models import Draft, DraftReview, ReviewReviewer, \
        DraftFileExist
from seahub.test_utils import BaseTestCase

from seaserv import seafile_api


class DraftManagerTest(BaseTestCase):
    def test_list_draft_by_username(self):
        assert len(Draft.objects.all()) == 0
        Draft.objects.add(self.user.username, self.repo, self.file)

        draft_list = Draft.objects.list_draft_by_username(self.user.username)

        assert len(draft_list) == 1

    def test_list_draft_by_username_with_invalid_repo(self):
        self.login_as(self.user)
        assert len(Draft.objects.all()) == 0
        Draft.objects.add(self.user.username, self.repo, self.file)

        url = reverse('api2-repo', args=[self.repo.id])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        draft_list = Draft.objects.list_draft_by_username(self.user.username)

        assert len(draft_list) == 0
        assert len(Draft.objects.all()) == 1

    def test_list_draft_by_username_with_invalid_origin_file(self):
        self.login_as(self.user)
        assert len(Draft.objects.all()) == 0

        url = reverse('api-v2.1-drafts')
        resp = self.client.post(url, {
            'repo_id': self.repo.id,
            'file_path': self.file,
        })

        self.assertEqual(200, resp.status_code)

        file_url = reverse('api-v2.1-file-view', args=[self.repo.id])
        d_resp = self.client.delete(file_url + '?p=' + self.file,
                {}, 'application/x-www-form-urlencoded')

        self.assertEqual(200, d_resp.status_code)

        draft_list = Draft.objects.list_draft_by_username(self.user.username)

        assert len(draft_list) == 1
        assert len(Draft.objects.all()) == 1

    def test_add(self):
        assert len(Draft.objects.all()) == 0
        draft = Draft.objects.add(self.user.username, self.repo, self.file)

        assert draft is not None
        assert len(Draft.objects.all()) == 1

        d = draft.to_dict()
        assert d['origin_repo_id'] == self.repo.id
        assert d['origin_file_path'] == self.file
        assert len(d['draft_file_path']) > 0

    def test_add_another_file(self):
        file2 = self.create_file(repo_id=self.repo.id,
                                 parent_dir='/',
                                 filename='test2.txt',
                                 username=self.user.username)

        assert len(Draft.objects.all()) == 0
        draft = Draft.objects.add(self.user.username, self.repo, self.file)
        assert draft is not None
        assert len(Draft.objects.all()) == 1

        draft2 = Draft.objects.add(self.user.username, self.repo, file2)
        assert draft2 is not None
        assert len(Draft.objects.all()) == 2


class DraftTest(BaseTestCase):
    def test_delete(self):
        assert len(Draft.objects.all()) == 0
        d = Draft.objects.add(self.user.username, self.repo, self.file)

        assert d is not None
        assert len(Draft.objects.all()) == 1
        assert seafile_api.get_file_id_by_path(d.origin_repo_id, d.draft_file_path) is not None

        d = Draft.objects.all()[0]
        d.delete(self.user.username)

        assert len(Draft.objects.all()) == 0
        assert seafile_api.get_file_id_by_path(d.origin_repo_id, d.draft_file_path) is None

    def test_publish(self):
        assert len(Draft.objects.all()) == 0
        d = Draft.objects.add(self.user.username, self.repo, self.file)
        assert d is not None
        assert len(Draft.objects.all()) == 1
        assert seafile_api.get_file_id_by_path(d.origin_repo_id, d.draft_file_path) is not None
        assert len(seafile_api.list_dir_by_path(self.repo.id, '/Drafts')) == 1

        d.publish(self.user.username)

        # file is updated in origin repo
        assert len(seafile_api.list_dir_by_path(self.repo.id, '/')) == 2


class DraftReviewManagerTest(BaseTestCase):
    def setUp(self):
        self.draft = Draft.objects.add(self.user.username, self.repo, self.file)

    def test_add(self):
        assert len(DraftReview.objects.all()) == 0
        review = DraftReview.objects.add(self.user.username, self.draft)

        assert review is not None
        assert len(DraftReview.objects.all()) == 1

        r = review.to_dict()
        assert r['draft_origin_repo_id'] == self.repo.id
        assert len(r['draft_file_path']) > 0

    def test_get_reviews_by_creator_and_status(self):
        assert(len(DraftReview.objects.get_reviews_by_creator_and_status(self.user.username, 'open')) == 0)
        DraftReview.objects.add(self.user.username, self.draft)
        assert(len(DraftReview.objects.get_reviews_by_creator_and_status(self.user.username, 'open')) == 1)

    def test_get_reviews_by_creator_and_status_with_invalid_repo(self):
        self.login_as(self.user)
        assert(len(DraftReview.objects.get_reviews_by_creator_and_status(self.user.username, 'open')) == 0)
        DraftReview.objects.add(self.user.username, self.draft)

        resp = self.client.delete(
            reverse('api2-repo', args=[self.repo.id])
        )
        self.assertEqual(200, resp.status_code)

        assert(len(DraftReview.objects.all()) == 1)
        assert(len(DraftReview.objects.get_reviews_by_creator_and_status(self.user.username, 'open')) == 0)

    def test_get_reviews_by_creator_and_status_with_invalid_origin_file(self):
        self.login_as(self.user)
        assert(len(DraftReview.objects.get_reviews_by_creator_and_status(self.user.username, 'open')) == 0)

        DraftReview.objects.add(self.user.username, self.draft)
        url = reverse('api-v2.1-file-view', args=[self.repo.id])
        d_resp = self.client.delete(url + '?p=' + self.file,
                {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, d_resp.status_code)

        assert(len(DraftReview.objects.all()) == 1)
        assert(len(DraftReview.objects.get_reviews_by_creator_and_status(self.user.username, 'open')) == 1)

    def test_get_reviews_by_reviewer_and_status(self):
        assert(len(DraftReview.objects.get_reviews_by_reviewer_and_status('foo@foo.com', 'open')) == 0)
        review = DraftReview.objects.add(self.user.username, self.draft)
        ReviewReviewer.objects.add('foo@foo.com', review)
        assert(len(DraftReview.objects.get_reviews_by_reviewer_and_status('foo@foo.com', 'open')) == 1)
