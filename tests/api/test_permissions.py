from unittest.mock import Mock

from django.test import SimpleTestCase

from seahub.api2.permissions import IsOrgAdminUser


class IsOrgAdminUserTest(SimpleTestCase):

    def _request(self, org):
        user = Mock()
        user.org = org
        request = Mock()
        request.user = user
        return request

    def _view(self, org_id):
        view = Mock()
        view.kwargs = {'org_id': org_id}
        return view

    def test_allows_matching_org_admin(self):
        perm = IsOrgAdminUser()
        request = self._request(Mock(is_staff=True, org_id=1))
        assert perm.has_permission(request, self._view('1')) is True

    def test_denies_org_member_who_is_not_admin(self):
        perm = IsOrgAdminUser()
        request = self._request(Mock(is_staff=False, org_id=1))
        assert perm.has_permission(request, self._view('1')) is False

    def test_denies_org_admin_of_another_org(self):
        perm = IsOrgAdminUser()
        request = self._request(Mock(is_staff=True, org_id=2))
        assert perm.has_permission(request, self._view('1')) is False

    def test_denies_user_without_org(self):
        """A user who belongs to no organization must be denied, not crash."""
        perm = IsOrgAdminUser()
        request = self._request(None)
        assert perm.has_permission(request, self._view('1')) is False

    def test_denies_user_object_without_org_attribute(self):
        perm = IsOrgAdminUser()
        user = Mock(spec=[])
        request = Mock()
        request.user = user
        assert perm.has_permission(request, self._view('1')) is False

    def test_denies_when_org_id_missing(self):
        perm = IsOrgAdminUser()
        request = self._request(Mock(is_staff=True, org_id=1))
        view = Mock()
        view.kwargs = {}
        assert perm.has_permission(request, view) is False

    def test_denies_when_org_id_is_not_a_number(self):
        perm = IsOrgAdminUser()
        request = self._request(Mock(is_staff=True, org_id=1))
        assert perm.has_permission(request, self._view('abc')) is False
