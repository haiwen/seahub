import json

from django.core.urlresolvers import reverse
from seaserv import seafile_api

from seahub.test_utils import BaseTestCase


class OwnReposTrashApiTest(BaseTestCase):

    def test_get_repos_trash(self):
        self.login_as(self.user)
        name = self.user.username
        repoid = self.create_repo(name='test-repo', desc='',
                                                    username=name,
                                                    passwd=None)
        repo = seafile_api.get_repo(repoid)
        self.remove_repo(repoid)

        trashs = self.client.get(reverse("api2-v2.1-repos-trash"))
        json_trashs = json.loads(trashs.content)
        assert json_trashs[0]['id'] == repo.id
        assert json_trashs[0]['owner'] == name
        assert json_trashs[0]['name'] == repo.name
        assert json_trashs[0]['org_id'] == repo.org_id
        assert json_trashs[0]['size'] == repo.size
        self.assertIsNotNone(json_trashs[0]['head_id'])
        self.assertIsNotNone(json_trashs[0]['del_time'])
        self.assertIsNotNone(json_trashs[0]['del_time_relative'])
        self.assertIsNotNone(json_trashs[0]['size_formatted'])
