import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from seahub.api2.endpoints import share_links


class ShareLinkAccessTest(unittest.TestCase):

    def setUp(self):
        self.share = Mock(repo_id='source', path='/shared/', token='token', s_type='d')
        self.share.is_expired.return_value = False
        self.share.is_encrypted.return_value = False
        self.share.is_file_share_link.return_value = False
        self.share.is_dir_share_link.return_value = True
        self.share.get_permissions.return_value = {'can_download': True}
        self.request = SimpleNamespace(
            user=SimpleNamespace(is_authenticated=True, username='visitor'),
            session={}, POST=Mock())
        self.request.POST.get.side_effect = lambda key, default='': {
            'dst_repo_id': 'destination', 'dst_parent_dir': '/',
            'path': 'file.txt', 'src_parent_dir': '/',
        }.get(key, default)
        self.request.POST.getlist.return_value = ['file.txt']

    def call_endpoints(self):
        return [
            share_links.ShareLinkRepoTags().get(self.request, 'token'),
            share_links.ShareLinkRepoTagsTaggedFiles().get(self.request, 'token', '1'),
            share_links.ShareLinkSaveFileToRepo().post(self.request, 'token'),
            share_links.ShareLinkSaveItemsToRepo().post(self.request, 'token'),
        ]

    def test_denied_links_do_not_read_metadata_or_copy(self):
        for reason in ('expired', 'password', 'scope', 'login'):
            with self.subTest(reason=reason), \
                    patch.object(share_links, 'FileShare') as shares, \
                    patch.object(share_links, 'seafile_api') as api, \
                    patch.object(share_links, 'RepoTags') as tags, \
                    patch.object(share_links, 'SHARE_LINK_LOGIN_REQUIRED', reason == 'login'), \
                    patch.object(share_links, 'check_share_link_common', return_value=(reason != 'password', '')), \
                    patch.object(share_links, 'check_share_link_access_by_scope', return_value=reason != 'scope'):
                shares.objects.get.return_value = self.share
                self.share.is_expired.return_value = reason == 'expired'
                self.share.is_encrypted.return_value = reason == 'password'
                self.request.user.is_authenticated = reason != 'login'
                self.assertEqual([response.status_code for response in self.call_endpoints()], [403] * 4)
                api.get_repo.assert_not_called()
                api.copy_file.assert_not_called()
                tags.objects.filter.assert_not_called()

    def test_authenticated_password_session_is_allowed(self):
        self.share.is_encrypted.return_value = True
        with patch.object(share_links, 'SHARE_LINK_LOGIN_REQUIRED', False), \
                patch.object(share_links, 'check_share_link_common', return_value=(True, '')) as password_check, \
                patch.object(share_links, 'check_share_link_access_by_scope', return_value=True):
            self.assertIsNone(share_links._check_share_link_access(self.request, self.share))
            password_check.assert_called_once_with(self.request, self.share)

    def test_shared_folder_itself_is_in_scope(self):
        self.assertTrue(share_links._is_tagged_file_in_share_link(
            self.share, {'parent_path': '/', 'filename': 'shared'}))
        self.assertFalse(share_links._is_tagged_file_in_share_link(
            self.share, {'parent_path': '/', 'filename': 'shared-other'}))

    def test_tag_folder_scope_has_path_boundary(self):
        for parent, allowed in (('/shared/', True), ('/shared/nested/', True),
                                ('/shared-other/', False), ('/private/', False)):
            with self.subTest(parent=parent):
                self.assertEqual(share_links._is_tagged_file_in_share_link(
                    self.share, {'parent_path': parent, 'filename': 'file.txt'}), allowed)
        self.share.path = '/'
        self.assertTrue(share_links._is_tagged_file_in_share_link(
            self.share, {'parent_path': '/nested/', 'filename': 'file.txt'}))

    def test_tag_file_scope_only_matches_shared_file(self):
        self.share.path = '/shared/file.txt'
        self.share.is_file_share_link.return_value = True
        for filename, allowed in (('file.txt', True), ('other.txt', False)):
            self.assertEqual(share_links._is_tagged_file_in_share_link(
                self.share, {'parent_path': '/shared/', 'filename': filename}), allowed)

    def test_save_rejects_parent_traversal(self):
        self.request.POST.get.side_effect = lambda key, default='': {
            'dst_repo_id': 'destination', 'dst_parent_dir': '/',
            'path': '../private/file.txt', 'src_parent_dir': '../private/',
        }.get(key, default)
        with patch.object(share_links, 'FileShare') as shares, \
                patch.object(share_links, '_check_share_link_access', return_value=None), \
                patch.object(share_links, 'seafile_api') as api, \
                patch.object(share_links, 'check_folder_permission', return_value='rw'):
            shares.objects.get.return_value = self.share
            self.assertEqual(share_links.ShareLinkSaveFileToRepo().post(self.request, 'token').status_code, 403)
            self.assertEqual(share_links.ShareLinkSaveItemsToRepo().post(self.request, 'token').status_code, 403)
            api.copy_file.assert_not_called()

    def test_save_rejects_traversal_in_item_name(self):
        self.request.POST.getlist.return_value = ['../private/file.txt']
        with patch.object(share_links, 'FileShare') as shares, \
                patch.object(share_links, '_check_share_link_access', return_value=None), \
                patch.object(share_links, 'seafile_api') as api, \
                patch.object(share_links, 'check_folder_permission', return_value='rw'):
            shares.objects.get.return_value = self.share
            self.assertEqual(share_links.ShareLinkSaveItemsToRepo().post(self.request, 'token').status_code, 400)
            api.copy_file.assert_not_called()

    def test_allowed_requests_keep_only_in_scope_tags_and_files(self):
        tag = SimpleNamespace(pk=1, repo_id='source', to_dict=lambda: {'repo_tag_id': 1})
        outside_tag = SimpleNamespace(pk=2, repo_id='source', to_dict=lambda: {'repo_tag_id': 2})
        inside = {'parent_path': '/shared/deep/shared/', 'filename': 'inside.txt'}
        shared_folder = {'parent_path': '/', 'filename': 'shared'}
        outside = {'parent_path': '/shared-other/', 'filename': 'outside.txt'}
        with patch.object(share_links, 'FileShare') as shares, \
                patch.object(share_links, '_check_share_link_access', return_value=None), \
                patch.object(share_links, 'seafile_api') as api, \
                patch.object(share_links, 'RepoTags') as tags, \
                patch.object(share_links, 'get_tagged_files') as get_files, \
                patch.object(share_links, 'check_folder_permission', return_value='rw'), \
                patch.object(share_links, 'check_filename_with_rename', return_value='file.txt'):
            shares.objects.get.return_value = self.share
            tags.objects.filter.return_value = [tag, outside_tag]
            tags.objects.get_repo_tag_by_id.return_value = tag
            get_files.side_effect = lambda repo, tag_id: {
                'tagged_files': [dict(inside), dict(shared_folder), dict(outside)]
                if str(tag_id) == '1' else [dict(outside)]}
            api.copy_file.return_value = SimpleNamespace(background=True, task_id='task')
            responses = self.call_endpoints()
            self.assertEqual([response.status_code for response in responses], [200] * 4)
            self.assertEqual(responses[0].data['repo_tags'], [{'repo_tag_id': 1, 'files_count': 2}])
            self.assertEqual(responses[1].data['tagged_files'], [
                {'parent_path': '/deep/shared/', 'filename': 'inside.txt'},
                {'parent_path': '/', 'filename': 'shared'}])
            self.assertEqual(api.copy_file.call_count, 2)

    def test_tag_from_another_library_is_rejected(self):
        with patch.object(share_links, 'FileShare') as shares, \
                patch.object(share_links, '_check_share_link_access', return_value=None), \
                patch.object(share_links, 'seafile_api'), \
                patch.object(share_links, 'RepoTags') as tags, \
                patch.object(share_links, 'get_tagged_files') as get_files:
            shares.objects.get.return_value = self.share
            tags.objects.get_repo_tag_by_id.return_value = SimpleNamespace(repo_id='other')
            response = share_links.ShareLinkRepoTagsTaggedFiles().get(self.request, 'token', '1')
            self.assertEqual(response.status_code, 404)
            get_files.assert_not_called()
