from django.core.urlresolvers import reverse

from tests.api.apitestbase import ApiTestBase
from tests.common.utils import apiurl


class GroupRepoTest(ApiTestBase):
    def create_group_repo(self, group_id, expected=None, *args, **kwargs):
        path = apiurl(reverse("api2-grouprepos", args=[group_id]))
        data = {"name": 'grepo-test'}
        data.update(kwargs)
        resp = self.post(path, data=data, expected=expected)

        return resp

    def test_can_add(self):
        with self.get_tmp_group() as group:
            resp = self.create_group_repo(group.group_id)

            assert resp.status_code == 200
            assert len(resp.json()) == 9

    def test_add_with_wrong_perm(self):
        with self.get_tmp_group() as group:
            resp = self.create_group_repo(group.group_id, permission='rr')

            assert resp.status_code == 400

    def test_can_list(self):
        with self.get_tmp_group() as group:
            self.create_group_repo(group.group_id)

            path = apiurl(reverse("api2-grouprepos", args=[group.group_id]))
            resp = self.get(path)

            assert resp.status_code == 200
            assert len(resp.json()) == 1

    def test_can_delete(self):
        with self.get_tmp_group() as group:
            resp = self.create_group_repo(group.group_id)

            repo_id = resp.json()['id']
            path = apiurl(reverse("api2-grouprepo", args=[group.group_id, repo_id]))
            resp = self.delete(path)
            assert resp.status_code == 200
