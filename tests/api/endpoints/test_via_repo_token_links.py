import json
import stat
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from constance.test import override_config
from django.test import TestCase
from django.urls import reverse
from seaserv import ccnet_api, seafile_api

from seahub.api2.models import Token
from seahub.base.accounts import User, UserPermissions
from seahub.constants import DEFAULT_USER, PERMISSION_READ, PERMISSION_READ_WRITE
from seahub.ocm.models import OCMShare
from seahub.repo_api_tokens.models import RepoAPITokens
from seahub.share.models import FileShare, UploadLinkShare, check_share_link_access, check_share_link_common


class ViaRepoTokenLinksTest(TestCase):
    def setUp(self):
        self.user = User('automation@example.com')
        self.user.id = 1
        self.user.is_active = True
        self.user.role = DEFAULT_USER
        self.user._cached_orgs = []
        self.repo_id = str(uuid4())
        self.folder = '/incoming/'
        self.file = '/report.txt'
        repo = SimpleNamespace(id=self.repo_id, repo_name='Supplier documents', encrypted=False, is_virtual=False)
        dirent = SimpleNamespace(mode=stat.S_IFREG, size=0)
        patchers = (
            patch.object(User.objects, 'get', return_value=self.user),
            patch.object(ccnet_api, 'get_orgs_by_user', return_value=[]),
            patch.object(seafile_api, 'get_repo', return_value=repo),
            patch.object(seafile_api, 'get_repo_status', return_value=0, create=True),
            patch.object(seafile_api, 'check_permission_by_path', return_value='rw'),
            patch.object(seafile_api, 'get_dir_id_by_path', return_value='directory-id'),
            patch.object(seafile_api, 'get_file_id_by_path', return_value='file-id'),
            patch.object(seafile_api, 'get_dirent_by_path', return_value=dirent),
            patch('seahub.api2.endpoints.via_repo_token.get_org_id_by_repo_id', return_value=None),
        )
        for patcher in patchers:
            patcher.start()
            self.addCleanup(patcher.stop)

        self.upload_url = reverse('via-repo-token-upload-links')
        self.share_url = reverse('via-repo-token-share-links')
        self.headers = self.token_headers(PERMISSION_READ_WRITE)

    def token_headers(self, permission):
        token = RepoAPITokens.objects.create_token('supplier-intake', self.repo_id,
                                                  self.user.username, permission=permission)
        return {'HTTP_AUTHORIZATION': 'Token ' + token.token}

    def update_link(self, url, data):
        return self.client.put(url, json.dumps(data), 'application/json', **self.headers)

    def test_link_routes_keep_their_allowed_methods(self):
        for kind, list_url in (('share', self.share_url), ('upload', self.upload_url)):
            with self.subTest(kind=kind):
                detail_url = reverse('via-repo-token-%s-link' % kind, args=['abcd'])
                response = self.client.put(list_url, **self.headers)
                self.assertEqual(405, response.status_code)
                self.assertEqual({'GET', 'POST', 'HEAD', 'OPTIONS'}, set(response['Allow'].split(', ')))

                response = self.client.post(detail_url, {'path': '/'}, **self.headers)
                self.assertEqual(405, response.status_code)
                self.assertEqual({'PUT', 'DELETE', 'OPTIONS'}, set(response['Allow'].split(', ')))

    def test_upload_link_lifecycle(self):
        password = 'Initial-Supplier-2026!'
        new_password = 'Updated-Supplier-2026!'
        with self.assertLogs('seahub.repo_api_tokens.utils', level='INFO') as logs:
            response = self.client.post(self.upload_url,
                                        {'path': self.folder, 'password': password, 'expire_days': 2},
                                        **self.headers)
            self.assertEqual(200, response.status_code)
            info = response.json()
            token = info['token']
            self.assertIn('/u/d/', info['link'])
            self.assertTrue(info['has_password'])
            self.assertNotIn('password', info)

            response = self.client.get(self.upload_url, {'path': self.folder}, **self.headers)
            self.assertEqual([token], [link['token'] for link in response.json()])

            visitor = SimpleNamespace(session={}, method='POST', POST={'password': password})
            old_link = UploadLinkShare.objects.get(token=token)
            self.assertTrue(check_share_link_common(visitor, old_link, is_upload_link=True)[0])
            self.assertTrue(check_share_link_access(visitor, token, is_upload_link=True))
            url = reverse('via-repo-token-upload-link', args=[token])
            response = self.update_link(url, {'password': new_password, 'expire_days': 4})
            self.assertEqual(200, response.status_code)
            self.assertEqual(info['link'], response.json()['link'])
            self.assertGreater(response.json()['expire_date'], info['expire_date'])
            self.assertFalse(check_share_link_access(visitor, token, is_upload_link=True))
            check_share_link_common(visitor, old_link, is_upload_link=True)
            self.assertFalse(check_share_link_access(visitor, token, is_upload_link=True))
            self.assertEqual(new_password, UploadLinkShare.objects.get(token=token).get_password())

            response = self.client.delete(url, **self.headers)
            self.assertEqual(200, response.status_code)
            self.assertFalse(UploadLinkShare.objects.filter(token=token).exists())

        self.assertEqual(3, len(logs.output))
        for entry in logs.output:
            self.assertIn("app_name='supplier-intake'", entry)
            self.assertNotIn(token, entry)
            self.assertNotIn(new_password, entry)

    @override_config(SHARE_LINK_FORCE_USE_PASSWORD=True)
    def test_upload_link_post_reuses_only_matching_options(self):
        options = {
            'path': self.folder,
            'password': 'Initial-Supplier-2026!',
            'expiration_time': '2099-12-31T12:00:00+00:00',
            'description': 'Original description',
        }
        response = self.client.post(self.upload_url, options, **self.headers)
        self.assertEqual(200, response.status_code)
        info = response.json()

        for data in (options, {'path': self.folder}):
            response = self.client.post(self.upload_url, data, **self.headers)
            self.assertEqual(200, response.status_code)
            self.assertEqual(info, response.json())

        for changes in (
                {'password': 'Updated-Supplier-2026!'},
                {'expiration_time': '2099-12-30T12:00:00+00:00'},
                {'expire_days': 7, 'expiration_time': ''},
                {'description': 'Updated description'}):
            with self.subTest(changes=changes):
                response = self.client.post(self.upload_url, {**options, **changes}, **self.headers)
                self.assertEqual(409, response.status_code)
                self.assertIn('PUT', response.json()['error_msg'])

        link = UploadLinkShare.objects.get(repo_id=self.repo_id, path=self.folder)
        self.assertEqual(info['token'], link.token)
        self.assertEqual(options['password'], link.get_password())
        response = self.client.get(self.upload_url, {'path': self.folder}, **self.headers)
        self.assertEqual([info], response.json())

        url = reverse('via-repo-token-upload-link', args=[link.token])
        for description in ('Updated description', ''):
            response = self.update_link(url, {'description': description})
            self.assertEqual(200, response.status_code)
            link.refresh_from_db()
            self.assertEqual(description, link.description)

    def test_create_and_update_share_link_with_options(self):
        member = User('member@example.com')
        users = {user.username: user for user in (self.user, member)}
        data = {
            'path': self.file,
            'password': 'Initial-Supplier-2026!',
            'expire_days': 2,
            'user_scope': 'specific_users',
            'emails': [self.user.username, member.username, self.user.username],
        }
        with patch.object(User.objects, 'get', side_effect=lambda email: users[email]):
            with self.captureOnCommitCallbacks() as callbacks:
                response = self.client.post(self.share_url, json.dumps(data), 'application/json', **self.headers)
        self.assertEqual(200, response.status_code)
        self.assertEqual([], callbacks)
        info = response.json()
        link = FileShare.objects.get(token=info['token'])
        self.assertEqual('specific_users', link.user_scope)
        self.assertEqual({'authed_users': [self.user.username, member.username]}, json.loads(link.authed_details))
        url = reverse('via-repo-token-share-link', args=[link.token])

        data = {'password': 'Updated-Supplier-2026!', 'expiration_time': '2099-12-31T12:00:00+00:00',
                'permissions': {'can_download': False}}
        response = self.update_link(url, data)
        self.assertEqual(200, response.status_code)
        self.assertEqual(info['link'], response.json()['link'])
        self.assertFalse(response.json()['permissions']['can_download'])
        link.refresh_from_db()
        self.assertEqual(data['password'], link.get_password())
        self.assertEqual('specific_users', link.user_scope)

        response = self.update_link(url, {'password': 'Another-Supplier-2026!', 'expire_days': -1})
        self.assertEqual(400, response.status_code)
        link.refresh_from_db()
        self.assertEqual(data['password'], link.get_password())

    def test_create_share_link_rejects_invalid_scope(self):
        for scope in ('', None, False, 0, [], {}, ['all_users'], 'invalid'):
            with self.subTest(scope=scope):
                data = {'path': self.file, 'user_scope': scope, 'emails': 'member@example.com'}
                with self.captureOnCommitCallbacks() as callbacks:
                    response = self.client.post(self.share_url, json.dumps(data), 'application/json', **self.headers)
                self.assertEqual(400, response.status_code)
                self.assertEqual('user_scope invalid.', response.json()['error_msg'])
                self.assertFalse(FileShare.objects.filter(repo_id=self.repo_id).exists())
                self.assertEqual([], callbacks)

    def test_create_public_share_link_rejects_recipients(self):
        for options in ({}, {'user_scope': 'all_users'}):
            for emails in ('member@example.com', ['member@example.com'], '', [], None):
                with self.subTest(options=options, emails=emails):
                    data = {'path': self.file, 'emails': emails, **options}
                    with self.captureOnCommitCallbacks() as callbacks:
                        response = self.client.post(self.share_url, json.dumps(data), 'application/json', **self.headers)
                    self.assertEqual(400, response.status_code)
                    self.assertEqual('emails is not allowed for all_users.', response.json()['error_msg'])
                    self.assertFalse(FileShare.objects.filter(repo_id=self.repo_id).exists())
                    self.assertEqual([], callbacks)

    def test_create_share_link_rejects_invalid_description(self):
        for description in ([], ['description'], {}, None, 0, False):
            with self.subTest(description=description):
                data = {'path': self.file, 'user_scope': 'specific_emails', 'emails': 'member@example.com',
                        'description': description}
                with self.captureOnCommitCallbacks() as callbacks:
                    response = self.client.post(self.share_url, json.dumps(data), 'application/json', **self.headers)
                self.assertEqual(400, response.status_code)
                self.assertEqual('description invalid.', response.json()['error_msg'])
                self.assertFalse(FileShare.objects.filter(repo_id=self.repo_id).exists())
                self.assertEqual([], callbacks)

    def test_create_share_link_description_round_trip(self):
        for options in ({}, {'description': ''}, {'description': 'Supplier documents'}, {'user_scope': 'all_users'}):
            with self.subTest(options=options):
                data = {'path': self.file, **options}
                response = self.client.post(self.share_url, json.dumps(data), 'application/json', **self.headers)
                self.assertEqual(200, response.status_code)
                info = response.json()
                description = options.get('description', '')
                self.assertEqual('all_users', info['user_scope'])
                self.assertEqual(description, info['description'])
                link = FileShare.objects.get(token=info['token'])
                self.assertEqual(description, link.description)
                response = self.client.get(self.share_url, {'path': self.file}, **self.headers)
                self.assertEqual(200, response.status_code)
                self.assertEqual(info['token'], response.json()[0]['token'])
                self.assertEqual(description, response.json()[0]['description'])

    def test_share_link_rejects_invalid_specific_users(self):
        link = FileShare.objects.create_file_link(self.user.username, self.repo_id, self.file,
                                                 description='Original description')
        url = reverse('via-repo-token-share-link', args=[link.token])
        unknown_email = 'unknown@example.com'

        def get_user(email):
            if email == unknown_email:
                raise User.DoesNotExist
            return self.user

        with patch.object(User.objects, 'get', side_effect=get_user):
            for options, error in (
                    ({}, 'emails invalid.'),
                    ({'emails': []}, 'emails invalid.'),
                    ({'emails': ['']}, 'emails invalid.'),
                    ({'emails': [None]}, 'emails invalid.'),
                    ({'emails': self.user.username}, 'emails invalid.'),
                    ({'emails': [unknown_email]}, 'emails contains an unknown user.'),
                    ({'emails': [self.user.username, unknown_email]}, 'emails contains an unknown user.')):
                with self.subTest(options=options):
                    data = {'user_scope': 'specific_users', 'description': 'Updated description', **options}
                    response = self.client.post(self.share_url, json.dumps({'path': self.file, **data}),
                                                'application/json', **self.headers)
                    self.assertEqual(400, response.status_code)
                    self.assertEqual(error, response.json()['error_msg'])
                    self.assertEqual(link.pk, FileShare.objects.get(repo_id=self.repo_id).pk)

                    response = self.update_link(url, data)
                    self.assertEqual(400, response.status_code)
                    self.assertEqual(error, response.json()['error_msg'])
                    link.refresh_from_db()
                    self.assertEqual('all_users', link.user_scope)
                    self.assertEqual('', link.authed_details)
                    self.assertEqual('Original description', link.description)

    def test_create_share_link_rejects_invalid_email_recipients(self):
        for options in (
                {},
                {'emails': ' ,;\n'},
                {'emails': 'invalid'},
                {'emails': 'member@example.com,invalid'},
                {'emails': ['member@example.com']}):
            with self.subTest(options=options):
                data = {'path': self.file, 'user_scope': 'specific_emails', **options}
                with self.captureOnCommitCallbacks() as callbacks:
                    response = self.client.post(self.share_url, json.dumps(data), 'application/json', **self.headers)
                self.assertEqual(400, response.status_code)
                self.assertFalse(FileShare.objects.filter(repo_id=self.repo_id).exists())
                self.assertEqual([], callbacks)

    def test_create_share_link_notifies_valid_email_recipients(self):
        data = {'path': self.file, 'user_scope': 'specific_emails', 'emails': 'member@example.com'}
        with patch('seahub.api2.endpoints.via_repo_token.send_share_link_emails') as send_emails:
            with self.captureOnCommitCallbacks(execute=True) as callbacks:
                response = self.client.post(self.share_url, json.dumps(data), 'application/json', **self.headers)
                self.assertEqual(200, response.status_code)
                send_emails.assert_not_called()

        link = FileShare.objects.get(token=response.json()['token'])
        self.assertEqual({'authed_emails': ['member@example.com']}, json.loads(link.authed_details))
        self.assertEqual(1, len(callbacks))
        self.assertEqual(1, send_emails.call_count)
        self.assertEqual((['member@example.com'], link), send_emails.call_args.args[:2])

    def test_update_share_link_description_and_scope(self):
        link = FileShare.objects.create_file_link(self.user.username, self.repo_id, self.file,
                                                 description='Original description')
        url = reverse('via-repo-token-share-link', args=[link.token])

        response = self.update_link(url, {'description': 'Updated description'})
        self.assertEqual(200, response.status_code)
        link.refresh_from_db()
        self.assertEqual('Updated description', link.description)

        response = self.update_link(url, {'user_scope': 'specific_users', 'emails': [self.user.username]})
        self.assertEqual(200, response.status_code)
        link.refresh_from_db()
        self.assertEqual('specific_users', link.user_scope)
        self.assertEqual({'authed_users': [self.user.username]}, json.loads(link.authed_details))

        with patch('seahub.api2.endpoints.via_repo_token.send_share_link_emails') as send_emails:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.update_link(url, {'user_scope': 'specific_emails', 'emails': 'first@example.com'})
                self.assertEqual(200, response.status_code)
                response = self.update_link(url, {'user_scope': 'specific_emails', 'emails': 'second@example.com'})
                self.assertEqual(200, response.status_code)
            send_emails.assert_not_called()
        link.refresh_from_db()
        self.assertEqual('specific_emails', link.user_scope)
        self.assertEqual({'authed_emails': ['second@example.com']}, json.loads(link.authed_details))

        response = self.update_link(url, {'user_scope': 'all_users', 'description': ''})
        self.assertEqual(200, response.status_code)
        link.refresh_from_db()
        self.assertEqual('all_users', link.user_scope)
        self.assertEqual('', link.authed_details)
        self.assertEqual('', link.description)

    def test_update_share_link_rejects_invalid_scope_without_saving(self):
        link = FileShare.objects.create_file_link(self.user.username, self.repo_id, self.file,
                                                 description='Original description')
        url = reverse('via-repo-token-share-link', args=[link.token])
        for data in (
                {'user_scope': 'invalid'},
                {'emails': ['member@example.com']},
                {'user_scope': 'specific_users'},
                {'user_scope': 'specific_emails', 'emails': 'member@example.com,invalid'},
                {'user_scope': 'all_users', 'emails': ['member@example.com']}):
            with self.subTest(data=data):
                response = self.update_link(url, {**data, 'description': 'Updated description'})
                self.assertEqual(400, response.status_code)

        link.refresh_from_db()
        self.assertEqual('all_users', link.user_scope)
        self.assertEqual('Original description', link.description)

    def test_link_management_is_limited_to_the_library(self):
        other_repo_id = str(uuid4())
        creator = 'member@example.com'
        for kind, create_link, path in (
                ('share', FileShare.objects.create_file_link, self.file),
                ('upload', UploadLinkShare.objects.create_upload_link_share, self.folder)):
            with self.subTest(kind=kind):
                local_link = create_link(creator, self.repo_id, path)
                other_link = create_link(creator, other_repo_id, path)
                url = reverse('via-repo-token-%s-links' % kind)
                response = self.client.get(url, {'repo_id': other_repo_id}, **self.headers)
                self.assertEqual([local_link.token], [link['token'] for link in response.json()])
                url_name = 'via-repo-token-%s-link' % kind
                other_url = reverse(url_name, args=[other_link.token])
                self.assertEqual(404, self.update_link(other_url, {'expire_days': 3}).status_code)
                self.assertEqual(404, self.client.delete(other_url, **self.headers).status_code)
                local_url = reverse(url_name, args=[local_link.token])
                self.assertEqual(200, self.update_link(local_url, {'expire_days': 3}).status_code)
                self.assertEqual(200, self.client.delete(local_url, **self.headers).status_code)

    def test_read_only_token_cannot_manage_links(self):
        headers = self.token_headers(PERMISSION_READ)
        for url in (self.share_url, self.upload_url):
            with self.subTest(url=url):
                self.assertEqual(403, self.client.get(url, **headers).status_code)
                self.assertEqual(403, self.client.post(url, {'path': '/'}, **headers).status_code)

    @override_config(SHARE_LINK_FORCE_USE_PASSWORD=True)
    def test_share_link_creation_requires_password_when_configured(self):
        self.assertEqual(400, self.client.post(self.share_url, {'path': '/'}, **self.headers).status_code)
        password = 'Initial-Supplier-2026!'
        response = self.client.post(self.share_url, {'path': '/', 'password': password}, **self.headers)
        self.assertEqual(200, response.status_code)
        self.assertEqual(password, response.json()['password'])

    def test_role_permissions_are_checked(self):
        with patch.object(UserPermissions, 'can_generate_upload_link', return_value=False):
            self.assertEqual(403, self.client.get(self.upload_url, **self.headers).status_code)
            self.assertEqual(403, self.client.post(self.upload_url, {'path': '/'}, **self.headers).status_code)
        with patch.object(UserPermissions, 'can_generate_share_link', return_value=False):
            self.assertEqual(403, self.client.post(self.share_url, {'path': '/'}, **self.headers).status_code)

    def test_ocm_token_cannot_manage_links(self):
        share = OCMShare.objects.add(str(uuid4()), self.user.username, 'partner@example.com',
                                     'https://partner.example.com', self.repo_id, 'Supplier documents',
                                     PERMISSION_READ_WRITE)
        headers = {'HTTP_AUTHORIZATION': 'Token ' + share.shared_secret}
        self.assertEqual(401, self.client.get(self.share_url, **headers).status_code)
        self.assertEqual(401, self.client.get(self.upload_url, **headers).status_code)

    def test_account_link_apis_keep_their_response(self):
        token = Token.objects.create(user=self.user.username)
        headers = {'HTTP_AUTHORIZATION': 'Token ' + token.key}
        password = 'Initial-Supplier-2026!'
        for kind, path in (('upload', self.folder), ('share', self.file)):
            with self.subTest(kind=kind):
                url = reverse('api-v2.1-%s-links' % kind)
                response = self.client.post(url, {'repo_id': self.repo_id, 'path': path, 'password': password},
                                            **headers)
                self.assertEqual(200, response.status_code)
                self.assertEqual(password, response.json()['password'])
