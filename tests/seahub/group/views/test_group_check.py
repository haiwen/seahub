from django.http import HttpResponse

from seahub.auth.models import AnonymousUser
from seahub.group.views import group_check
from seahub.test_utils import BaseTestCase


@group_check
def a_view(request, group):
    return HttpResponse('success')

class GroupCheckTest(BaseTestCase):
    def test_anonymous_user(self):
        self.fake_request.user = AnonymousUser()
        resp = a_view(self.fake_request, self.group.id)
        self.assertEqual(resp.status_code, 302)
        self.assertRegexpMatches(resp['Location'], '/accounts/login')

    def test_group_user(self):
        self.fake_request.user = self.user
        resp = a_view(self.fake_request, self.group.id)
        self.assertEqual(resp.status_code, 200)
        assert 'success' in resp.content

    def test_admin_user(self):
        self.fake_request.user = self.admin
        resp = a_view(self.fake_request, self.group.id)
        self.assertEqual(resp.status_code, 200)
        assert 'Permission denied' in resp.content
        assert 'success' not in resp.content
