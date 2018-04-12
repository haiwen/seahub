import json

from django.core.urlresolvers import reverse
import seaserv
from seaserv import seafile_api

from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

class AccountTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()
        self.user1 = self.create_user('user_%s@test.com' % randstring(4),
                                      is_staff=False)
        self.user2 = self.create_user('user_%s@test.com' % randstring(4),
                                      is_staff=False)

    def tearDown(self):
        self.remove_user(self.user1.username)
        self.remove_user(self.user2.username)

    def _do_create(self):
        resp = self.client.put(
            reverse('api2-account', args=['new_user@test.com']),
            'password=123456&is_staff=1&is_active=1',
            'application/x-www-form-urlencoded',
        )
        # manually remove this account
        self.remove_user(email='new_user@test.com')
        return resp

    def _do_get_info(self):
        return self.client.get(reverse('api2-account', args=[self.user1.email]))

    def _do_migrate(self):
        return self.client.post(
            reverse('api2-account', args=[self.user1.username]), {
                'op': 'migrate',
                'to_user': self.user2.username,
            }
        )

    def _do_update(self):
        return self.client.put(
            reverse('api2-account', args=[self.user1.username]),
            'password=654321&is_staff=1&is_active=0&name=user1&storage=102400&login_id=hello',
            'application/x-www-form-urlencoded',
        )

    def _do_update_name(self):
        return self.client.put(
            reverse('api2-account', args=[self.user1.username]),
            'name=user1',
            'application/x-www-form-urlencoded',
        )

    def _do_update_loginid(self):
        return self.client.put(
            reverse('api2-account', args=[self.user1.username]),
            'login_id=hello',
            'application/x-www-form-urlencoded',
        )

    def _do_update_loginid_useemptystring(self):
        return self.client.put(
            reverse('api2-account', args=[self.user1.username]),
            'login_id=',
            'application/x-www-form-urlencoded',
        )

    def _do_update_loginid_sendagain(self):
        self.client.put(
            reverse('api2-account', args=[self.user1.username]),
            'login_id=test',
            'application/x-www-form-urlencoded',
        )
        return self.client.put(
            reverse('api2-account', args=[self.user1.username]),
            'login_id=test',
            'application/x-www-form-urlencoded',
        )

    def _do_delete(self):
        return self.client.delete(
            reverse('api2-account', args=[self.user1.username])
        )

    def test_permission_error(self):
        self.login_as(self.user)

        resp = self._do_create()
        self.assertEqual(403, resp.status_code)

        resp = self._do_get_info()
        self.assertEqual(403, resp.status_code)

        resp = self._do_update()
        self.assertEqual(403, resp.status_code)

        resp = self._do_migrate()
        self.assertEqual(403, resp.status_code)

        resp = self._do_delete()
        self.assertEqual(403, resp.status_code)

    def test_get_info(self):
        self.login_as(self.admin)

        resp = self._do_get_info()
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 12
        assert json_resp['email'] == self.user1.username
        assert json_resp['is_staff'] is False
        assert json_resp['is_active'] is True
        assert json_resp['usage'] == 0

    def test_create(self):
        self.login_as(self.admin)

        resp = self._do_create()
        self.assertEqual(201, resp.status_code)

    def test_update(self):
        self.login_as(self.admin)

        resp = self._do_update()
        self.assertEqual(200, resp.status_code)

        self.assertTrue(User.objects.get(self.user1.username).check_password(
            '654321'))
        self.assertTrue(User.objects.get(self.user1.username).is_staff)
        self.assertFalse(User.objects.get(self.user1.username).is_active)
        self.assertEqual(Profile.objects.get_profile_by_user(
            self.user1.username).login_id, 'hello')
        self.assertEqual(Profile.objects.get_profile_by_user(
            self.user1.username).nickname, 'user1')
        self.assertEqual(seafile_api.get_user_quota(
            self.user1.username), 102400000000)

    def test_update_name(self):
        """only test name"""
        self.login_as(self.admin)
        resp = self._do_update_name()
        self.assertEqual(Profile.objects.get_profile_by_user(
            self.user1.username).nickname, 'user1')

    def test_update_loginid(self):
        """only test loginid"""
        self.login_as(self.admin)
        resp = self._do_update_loginid()
        self.assertEqual(Profile.objects.get_profile_by_user(
            self.user1.username).login_id, 'hello')

    def test_update_loginid_useemptystring(self):
        """test loginid, longid send the empty"""
        self.login_as(self.admin)
        resp = self._do_update_loginid_useemptystring()
        self.assertEqual(400, resp.status_code)

    def test_update_loginid_sendagain(self):
        """test loginid,sent twice"""
        self.login_as(self.admin)
        resp = self._do_update_loginid_sendagain()
        self.assertEqual(400, resp.status_code)

    def test_refresh_profile_cache_after_update(self):
        self.login_as(self.admin)
        self.assertEqual(email2nickname(self.user1.username),
                         self.user1.username.split('@')[0])

        resp = self._do_update()
        self.assertEqual(200, resp.status_code)

        self.assertEqual(email2nickname(self.user1.username), 'user1')

    def test_migrate(self):
        self.login_as(self.admin)

        # user1 created a repo
        user1_repo = self.create_repo(name='user1-repo', desc='',
                                      username=self.user1.username,
                                      passwd=None)
        user1_repos = seafile_api.get_owned_repo_list(self.user1.username)
        self.assertEqual(len(user1_repos), 1)
        self.assertEqual(user1_repos[0].id, user1_repo)

        # user1 created a group and joined a group created by the other
        user1_group = self.create_group(group_name='test_group',
                                        username=self.user1.username)
        other_group = self.create_group(group_name='other_group',
                                        username=self.user.username)
        seaserv.ccnet_threaded_rpc.group_add_member(other_group.id,
                                                    self.user.username,
                                                    self.user1.username)

        user1_groups = seaserv.get_personal_groups_by_user(self.user1.username)
        self.assertEqual(len(user1_groups), 2)

        real_creator = sorted([self.user1.username, self.user.username])
        test_creator = sorted([x.creator_name for x in user1_groups])
        self.assertEqual(real_creator, test_creator)

        real_id = sorted([user1_group.id, other_group.id])
        test_id = sorted([x.id for x in user1_groups])
        self.assertEqual(real_id, test_id)

        # user2 had no repos
        user2_repos = seafile_api.get_owned_repo_list(self.user2.username)
        self.assertEqual(len(user2_repos), 0)
        # user2 had no groups
        user2_groups = seaserv.get_personal_groups_by_user(self.user2.username)
        self.assertEqual(len(user2_groups), 0)

        # admin migrate account user1 to account user2
        resp = self._do_migrate()
        self.assertEqual(200, resp.status_code)

        ### Verify ###
        # user1 should have no repos
        new_user1_repos = seafile_api.get_owned_repo_list(self.user1.username)
        self.assertEqual(len(new_user1_repos), 0)
        # user1 should still in two groups, except not the creator anymore in
        # the first group, but second group should remain the same
        user1_groups = seaserv.get_personal_groups_by_user(self.user1.username)
        self.assertEqual(len(user1_groups), 2)

        real_creator = sorted([self.user1.username, self.user.username])
        test_creator = sorted([x.creator_name for x in user1_groups])
        self.assertNotEqual(real_creator, test_creator)

        real_id = sorted([user1_group.id, other_group.id])
        test_id = sorted([x.id for x in user1_groups])
        self.assertEqual(real_id, test_id)

        # user2 should have the repo used to be user1's
        new_user2_repos = seafile_api.get_owned_repo_list(self.user2.username)
        self.assertEqual(len(new_user2_repos), 1)
        self.assertEqual(new_user2_repos[0].id, user1_repo)
        # user2 should be in two groups, and is the creator of first group,
        # but second group should remain the same
        user2_groups = seaserv.get_personal_groups_by_user(self.user2.username)
        self.assertEqual(len(user2_groups), 2)

        real_creator = sorted([self.user2.username, self.user.username])
        test_creator = sorted([x.creator_name for x in user2_groups])
        self.assertEqual(real_creator, test_creator)

        real_id = sorted([user1_group.id, other_group.id])
        test_id = sorted([x.id for x in user2_groups])
        self.assertEqual(real_id, test_id)

    def test_delete(self):
        self.login_as(self.admin)

        resp = self._do_delete()
        self.assertEqual(200, resp.status_code)

    def test_new_user_get_info_after_edit_profile(self):
        new_user = self.create_user("test@new.user", is_staff=True)
        self.login_as(new_user)
        resp = self.client.post(reverse('edit_profile'), {
            'nickname': 'new nickname'
        })

        resp = self.client.get(reverse('api2-account', args=[new_user.username]))
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 12
        assert json_resp['email'] == new_user.username
        assert json_resp['is_staff'] is True
        assert json_resp['is_active'] is True
        assert json_resp['usage'] == 0
        assert json_resp['institution'] == ''
        self.remove_user(new_user.username)
