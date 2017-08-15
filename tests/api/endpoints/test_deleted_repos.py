import json

from django.core.urlresolvers import reverse
from seaserv import seafile_api

from seahub.test_utils import BaseTestCase
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email


class DeletedReposTest(BaseTestCase):

    def test_get_deleted_repos(self):
        self.logout()
        self.login_as(self.user)
        name = self.user.username
        repo = seafile_api.get_repo(self.create_repo(name='test-repo', desc='',
                                                    username=name,
                                                    passwd=None))
        self.remove_repo(repo.id)

        trashs = self.client.get(reverse("api2-v2.1-deleted-repos"))
        json_trashs = json.loads(trashs.content)
        json_trashs = [trash for trash in json_trashs if trash['repo_id'] == repo.id]
        assert json_trashs[0]['repo_id'] == repo.id
        assert json_trashs[0]['owner_email'] == name
        assert json_trashs[0]['owner_name'] == email2nickname(name)
        assert json_trashs[0]['owner_contact_email'] == email2contact_email(name)
        assert json_trashs[0]['repo_name'] == repo.name
        #assert json_trashs[0]['org_id'] == repo.org_id
        assert json_trashs[0]['size'] == repo.size
        self.assertIsNotNone(json_trashs[0]['head_commit_id'])
        self.assertIsNotNone(json_trashs[0]['del_time'])
        #self.assertIsNotNone(json_trashs[0]['encrypted'])

    def test_can_restore_deleted_repos(self, ):
        self.logout()
        self.login_as(self.user)
        name = self.user.username
        repo = seafile_api.get_repo(self.create_repo(name='test-repo', desc='',
                                                    username=name,
                                                    passwd=None))
        remove_status = self.remove_repo(repo.id)
        assert remove_status == 0
        response = self.client.post(
                reverse("api2-v2.1-deleted-repos"),
                {"repo_id": repo.id}
                )
        self.assertEqual(response.status_code, 200)

    def test_can_restore_deleted_repos_with_notdeleted(self):
        self.logout()
        self.login_as(self.user)
        name = self.user.username
        repoid = self.create_repo(name='test-repo-no-permission', desc='',
                                                    username=name,
                                                    passwd=None)
        repo = seafile_api.get_repo(self.create_repo(name='test-repo-no-del', 
                                                     desc='',
                                                     username=name,
                                                     passwd=None))
        response = self.client.post(
                reverse("api2-v2.1-deleted-repos"),
                {"repo_id": repo.id}
                )
        self.assertEqual(response.status_code, 400)

    def test_can_restore_repos_notbelong_self(self):
        self.logout()
        self.login_as(self.user)
        repo = seafile_api.get_repo(self.create_repo(name='test-repo', desc='',
                                                    username=self.user.username,
                                                    passwd=None))
        remove_status = self.remove_repo(repo.id)
        assert remove_status == 0
        self.logout()
        self.login_as(self.admin)

        response = self.client.post(
                reverse("api2-v2.1-deleted-repos"),
                {"repo_id": repo.id}
                )
        self.assertEqual(response.status_code, 403)

    def test_can_restore_repos_deleted_with_notbelong_slef(self):
        repo = seafile_api.get_repo(self.create_repo(name='test-repo', desc='',
                                                    username=self.user.username,
                                                    passwd=None))
        remove_status = self.remove_repo(repo.id)
        assert remove_status == 0
        self.logout()
        self.login_as(self.user)
        self.logout()
        self.login_as(self.user)

        response = self.client.post(
                reverse("api2-v2.1-deleted-repos"),
                {"repo_id": repo.id}
                )
        self.assertEqual(response.status_code, 200)

class data:
    def __init__(self, repo_id):
        self.repo_id = repo_id
