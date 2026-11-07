import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

import jwt
from django.core.exceptions import PermissionDenied
from django.test import RequestFactory, SimpleTestCase, override_settings
from django.http import JsonResponse
from rest_framework.test import APIRequestFactory

from seahub.exdraw import shared
from seahub.exdraw.apis import SharedSdocWhiteboard, SharedSdocWhiteboardImage
from seahub.auth.models import AnonymousUser


PARENT = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
BOARD = '11111111-2222-4333-8444-555555555555'
REPO = '22222222-3333-4444-8555-666666666666'


@override_settings(SHARE_LINK_LOGIN_REQUIRED=False)
class SharedWhiteboardAuthorizationTest(SimpleTestCase):
    def setUp(self):
        self.repo = SimpleNamespace(repo_id=REPO, org_id=-1, encrypted=False, is_virtual=False)
        self.share = SimpleNamespace(
            pk=1, token='abcd', username='creator@example.com', repo_id=REPO,
            path='/docs/document.sdoc', s_type='f', is_expired=lambda: False)
        self.mapping = SimpleNamespace(uuid=BOARD, filename='board.exdraw')
        self.request = SimpleNamespace(user=SimpleNamespace(username='', is_authenticated=False), session={})
        self.patches = {}
        for name in ('FileShare', 'check_share_link_access_by_scope', 'check_share_link_common',
                     'uuid_resource', 'creator_can_read', 'seafile_api', 'server_read'):
            patcher = patch.object(shared, name)
            self.patches[name] = patcher.start()
            self.addCleanup(patcher.stop)
        self.patches['FileShare'].objects.get_valid_file_link_by_token.return_value = self.share
        self.patches['check_share_link_access_by_scope'].return_value = True
        self.patches['check_share_link_common'].return_value = (True, '')
        self.patches['uuid_resource'].side_effect = [
            (None, self.repo, '/docs/document.sdoc', 'parent-id'),
            (self.mapping, self.repo, '/boards/board.exdraw', 'board-id'),
        ]
        self.patches['seafile_api'].get_repo.return_value = self.repo

    def authorize(self):
        return shared.authorize_share(self.request, 'abcd', PARENT, BOARD)

    def test_anonymous_share_uses_creator_not_visitor_permissions(self):
        self.authorize()
        self.patches['creator_can_read'].assert_any_call(
            self.repo, '/boards/board.exdraw', 'creator@example.com')
        self.patches['server_read'].assert_not_called()

    def test_missing_or_expired_share_stops_before_target_resolution(self):
        self.share.is_expired = lambda: True
        with self.assertRaises(PermissionDenied):
            self.authorize()
        self.patches['uuid_resource'].assert_not_called()

    def test_unverified_email_stops_before_resource_resolution(self):
        self.patches['check_share_link_access_by_scope'].return_value = False
        with self.assertRaises(PermissionDenied):
            self.authorize()
        self.patches['uuid_resource'].assert_not_called()

    def test_unverified_password_stops_before_resource_resolution(self):
        self.patches['check_share_link_common'].return_value = (False, '')
        with self.assertRaises(PermissionDenied):
            self.authorize()
        self.patches['uuid_resource'].assert_not_called()

    def test_file_share_cannot_be_used_for_another_parent(self):
        self.share.path = '/other.sdoc'
        with self.assertRaises(PermissionDenied):
            self.authorize()
        self.patches['creator_can_read'].assert_not_called()

    def test_directory_scope_requires_a_component_boundary(self):
        self.share.s_type = 'd'
        self.share.path = '/doc'
        with self.assertRaises(PermissionDenied):
            self.authorize()

    def test_creator_target_denial_never_calls_content_service(self):
        def check(repo, path, username, allow_share=True):
            if allow_share:
                raise PermissionDenied
        self.patches['creator_can_read'].side_effect = check
        with self.assertRaises(PermissionDenied):
            self.authorize()
        self.patches['server_read'].assert_not_called()

    @override_settings(SHARE_LINK_LOGIN_REQUIRED=True)
    def test_global_share_login_requirement_is_preserved(self):
        with self.assertRaises(PermissionDenied):
            self.authorize()
        self.patches['FileShare'].objects.get_valid_file_link_by_token.assert_not_called()


class SharedWhiteboardResourceTest(SimpleTestCase):
    def setUp(self):
        self.repo = SimpleNamespace(repo_id=REPO, org_id=-1, is_virtual=False)
        self.mapping = SimpleNamespace(uuid=BOARD, filename='board.exdraw')

    @override_settings(EXCALIDRAW_PRIVATE_KEY='existing-jwt-test-key-at-least-32-bytes', EXCALIDRAW_SERVER_URL='http://sdoc.test')
    @patch.object(shared.requests, 'get')
    def test_service_token_is_short_lived_and_bound_to_target_and_operation(self, get):
        get.return_value = Mock(status_code=200)
        get.return_value.json.return_value = {'elements': []}
        share = SimpleNamespace(pk=1, username='creator@example.com')
        shared.server_read(share, self.mapping)
        options = get.call_args.kwargs
        token = options['headers']['Authorization'].split()[1]
        payload = jwt.decode(token, 'existing-jwt-test-key-at-least-32-bytes', algorithms=['HS256'],
                             audience='sdoc-server-shared-exdraw', issuer='seahub')
        self.assertEqual(payload['file_uuid'], BOARD)
        self.assertEqual(payload['permission'], 'r')
        self.assertEqual(payload['operation'], 'read_scene')
        self.assertEqual(payload['exp'] - payload['iat'], 60)
        self.assertFalse(options['allow_redirects'])

    def test_image_lookup_uses_filename_without_an_element_id(self):
        scene = {'elements': [
            {'type': 'image', 'filename': 'one.png'},
            {'type': 'image', 'filename': 'two.png'},
        ]}
        self.assertEqual(shared.referenced_image(scene, {'filename': 'one.png'})['filename'], 'one.png')

    def test_unreferenced_or_deleted_filename_is_not_authorized(self):
        scene = {'elements': [{'type': 'image', 'filename': 'one.png', 'isDeleted': True}]}
        for filename in ('one.png', 'other.png'):
            with self.subTest(filename=filename), self.assertRaises(PermissionDenied):
                shared.referenced_image(scene, {'filename': filename})

    def test_same_file_can_be_referenced_by_multiple_image_elements(self):
        scene = {'elements': [{'type': 'image', 'filename': 'one.png'},
                              {'type': 'image', 'filename': 'one.png'}]}
        self.assertEqual(shared.referenced_image(scene, {'filename': 'one.png'})['filename'], 'one.png')

    @patch.object(shared, 'get_service_url', return_value='https://seafile.test')
    def test_library_image_lookup_matches_complete_path_not_basename(self, service):
        scene = {'elements': [{'type': 'image', 'dataURL':
            'https://seafile.test/lib/%s/file/allowed/photo.png?raw=1' % REPO}]}
        self.assertIn('dataURL', shared.referenced_image(scene, {'path': '/allowed/photo.png'}))
        with self.assertRaises(PermissionDenied):
            shared.referenced_image(scene, {'path': '/private/photo.png'})

    @patch.object(shared, 'resource')
    def test_attachment_directory_is_fixed_to_board(self, resource):
        resource.return_value = (self.repo, '/images/exdraw/' + BOARD + '/one.png', 'image-id')
        descriptor = {'file_uuid': BOARD, 'filename': 'one.png'}
        shared.image_resource(descriptor, self.mapping, self.repo, 'creator@example.com')
        resource.assert_called_once_with(REPO, '/images/exdraw/' + BOARD + '/one.png')

    def test_attachment_path_traversal_is_rejected(self):
        for filename in ('../other.png', '/other.png', 'dir\\other.png', 'bad\x00.png'):
            with self.subTest(filename=filename), self.assertRaises(PermissionDenied):
                shared.image_resource({'file_uuid': BOARD, 'filename': filename}, self.mapping, self.repo, 'creator')

    @patch.object(shared, 'get_service_url', return_value='https://seafile.test')
    @patch.object(shared, 'resource')
    @patch.object(shared, 'creator_can_read', side_effect=PermissionDenied)
    def test_referenced_library_image_still_requires_source_permission(self, check, resource, service):
        resource.return_value = (self.repo, '/private/photo.png', 'image-id')
        with self.assertRaises(PermissionDenied):
            shared.image_resource({'file_uuid': BOARD, 'dataURL':
                'https://seafile.test/lib/%s/file/private/photo.png?raw=1' % REPO},
                self.mapping, self.repo, 'creator@example.com')
        check.assert_called_once_with(self.repo, '/private/photo.png', 'creator@example.com')

    @patch.object(shared, 'get_service_url', return_value='https://seafile.test')
    def test_external_urls_are_not_proxied(self, service):
        with self.assertRaises(PermissionDenied):
            shared.image_resource({'file_uuid': BOARD, 'dataURL': 'https://external.test/p.png'},
                                  self.mapping, self.repo, 'creator')


class SharedWhiteboardPolicyTest(SimpleTestCase):
    @patch.object(shared, 'parse_repo_perm')
    @patch.object(shared, 'seafile_api')
    def test_policy_checks_actual_path_and_named_creator(self, api, parse):
        repo = SimpleNamespace(repo_id=REPO)
        api.check_permission_by_path.return_value = 'r'
        parse.return_value = SimpleNamespace(can_preview=True, can_download=True, can_generate_share_link=True)
        shared.creator_can_read(repo, '/private/board.exdraw', 'owner@example.com')
        api.check_permission_by_path.assert_called_once_with(REPO, '/private/board.exdraw', 'owner@example.com')

    @patch.object(shared, 'parse_repo_perm')
    @patch.object(shared, 'seafile_api')
    def test_preview_only_or_non_shareable_permissions_are_not_transferred(self, api, parse):
        api.check_permission_by_path.return_value = 'custom'
        for preview, download, shareable in ((True, False, True), (True, True, False), (False, True, True)):
            parse.return_value = SimpleNamespace(can_preview=preview, can_download=download, can_generate_share_link=shareable)
            with self.subTest(preview=preview, download=download, shareable=shareable), self.assertRaises(PermissionDenied):
                shared.creator_can_read(SimpleNamespace(repo_id=REPO), '/board.exdraw', 'owner')

    @patch.object(shared, 'parse_repo_perm')
    @patch.object(shared, 'seafile_api')
    def test_virtual_subfolder_view_must_map_to_the_same_resource(self, api, parse):
        origin = SimpleNamespace(repo_id=REPO, org_id=-1, is_virtual=False)
        view_repo = SimpleNamespace(repo_id='view-id', is_virtual=True, origin_repo_id=REPO,
                                    origin_path='/shared', encrypted=False)
        api.check_permission_by_path.side_effect = [None, 'r']
        api.convert_repo_path.return_value = '{"repo_id":"view-id","path":"/board.exdraw"}'
        api.get_repo.return_value = view_repo
        parse.return_value = SimpleNamespace(can_preview=True, can_download=True, can_generate_share_link=True)
        shared.creator_can_read(origin, '/shared/board.exdraw', 'owner')
        self.assertEqual(api.check_permission_by_path.call_args.args, ('view-id', '/board.exdraw', 'owner'))

    def test_password_and_email_session_belong_to_this_share(self):
        from seahub.share.models import check_share_link_common, check_share_link_access_by_scope
        request = SimpleNamespace(method='GET', user=SimpleNamespace(username=''), session={
            'visited_fs_other': True, 'link_authed_email_other': 'reader@example.com'})
        share = SimpleNamespace(token='current', username='owner', is_encrypted=lambda: True,
                                user_scope='specific_emails', authed_details='{"authed_emails":["reader@example.com"]}')
        self.assertFalse(check_share_link_common(request, share)[0])
        self.assertFalse(check_share_link_access_by_scope(request, share))
        request.session.update(visited_fs_current=True, link_authed_email_current='reader@example.com')
        self.assertTrue(check_share_link_common(request, share)[0])
        self.assertTrue(check_share_link_access_by_scope(request, share))


class SharedWhiteboardGatewayTest(SimpleTestCase):
    def setUp(self):
        self.request = RequestFactory().get('/whiteboard/')
        self.context = (SimpleNamespace(username='owner'), SimpleNamespace(uuid=BOARD, filename='board.exdraw'),
                        SimpleNamespace(repo_id=REPO), '/board.exdraw', 'id')
        self.text_patch = patch('seahub.utils.get_conf_text_ext', return_value=[])
        self.text_patch.start()
        self.addCleanup(self.text_patch.stop)

    @patch.object(shared, 'server_read')
    @patch.object(shared, 'authorize_share', side_effect=PermissionDenied)
    def test_gateway_denial_does_not_issue_token_or_load_scene(self, authorize, server):
        response = shared.shared_whiteboard(self.request, 'abcd', PARENT, BOARD, 'scene')
        self.assertEqual(response.status_code, 403)
        server.assert_not_called()

    @patch.object(shared, 'render')
    @patch.object(shared, 'authorize_share')
    def test_preview_shell_has_only_a_gateway_url(self, authorize, render):
        authorize.return_value = self.context
        render.return_value = JsonResponse({})
        response = shared.shared_whiteboard(self.request, 'abcd', PARENT, BOARD, 'preview')
        self.assertEqual(response.status_code, 200)
        data = render.call_args.args[2]
        self.assertIn('/share-links/abcd/seadoc/' + PARENT, data['shared_exdraw_scene_url'])
        self.assertNotIn('excalidraw_access_token', data)

    @patch.object(shared, 'server_read')
    @patch.object(shared, 'authorize_share')
    def test_scene_uses_image_gateway_without_raw_fallback(self, authorize, server):
        authorize.return_value = self.context
        server.return_value = {'elements': [
            {'id': 'image-1', 'fileId': 'file-1', 'type': 'image', 'filename': 'photo.png'},
        ]}
        response = shared.shared_whiteboard(self.request, 'abcd', PARENT, BOARD, 'scene')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertNotIn('dataURL', data['scene']['elements'][0])
        self.assertTrue(data['images']['file-1']['url'].endswith('/images/?filename=photo.png'))
        self.assertNotIn('element_id', data['images']['file-1']['url'])
        self.assertIn('no-store', response['Cache-Control'])

    @patch.object(shared, 'image_stream')
    @patch.object(shared, 'image_resource')
    @patch.object(shared, 'server_read')
    @patch.object(shared, 'authorize_share')
    def test_image_request_uses_original_filename_parameter(self, authorize, server, resource, stream):
        authorize.return_value = self.context
        server.return_value = {'elements': [{'type': 'image', 'filename': 'photo.png'}]}
        resource.return_value = (self.context[2], '/images/photo.png', 'image-id', 'image/png')
        stream.return_value = JsonResponse({})
        request = RequestFactory().get('/images/', {'filename': 'photo.png'})
        response = shared.shared_whiteboard(request, 'abcd', PARENT, BOARD, 'image')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(resource.call_args.args[0], {'type': 'image', 'filename': 'photo.png'})
        server.assert_called_once_with(self.context[0], self.context[1])

    @patch.object(shared, 'image_stream')
    @patch.object(shared, 'image_resource')
    @patch.object(shared, 'server_read')
    @patch.object(shared, 'authorize_share')
    def test_actual_image_endpoint_rejects_unreferenced_or_deleted_attachment(self, authorize, server, resource, stream):
        authorize.return_value = self.context
        for elements in ([], [{'type': 'image', 'filename': 'old.png', 'isDeleted': True}],
                         [{'type': 'image', 'filename': 'another.png'}]):
            with self.subTest(elements=elements):
                server.return_value = {'elements': elements}
                request = RequestFactory().get('/images/', {'filename': 'old.png'})
                request.user = AnonymousUser()
                request.session = {}
                with patch.object(SharedSdocWhiteboardImage, 'throttle_classes', ()):
                    response = SharedSdocWhiteboardImage.as_view()(
                        request, share_token='abcd', sdoc_uuid=PARENT, file_uuid=BOARD)
                self.assertEqual(response.status_code, 403)
        resource.assert_not_called()
        stream.assert_not_called()

    @patch.object(shared, 'image_stream')
    @patch.object(shared, 'image_resource')
    @patch.object(shared, 'server_read')
    @patch.object(shared, 'authorize_share')
    def test_attachment_with_one_remaining_live_reference_is_readable(self, authorize, server, resource, stream):
        authorize.return_value = self.context
        server.return_value = {'elements': [
            {'type': 'image', 'filename': 'photo.png', 'isDeleted': True},
            {'type': 'image', 'filename': 'photo.png'},
        ]}
        resource.return_value = (self.context[2], '/images/photo.png', 'image-id', 'image/png')
        stream.return_value = JsonResponse({})
        request = RequestFactory().get('/images/', {'filename': 'photo.png'})
        self.assertEqual(shared.shared_whiteboard(request, 'abcd', PARENT, BOARD, 'image').status_code, 200)

    @patch.object(shared, 'image_stream')
    @patch.object(shared, 'server_read')
    @patch.object(shared, 'authorize_share', side_effect=PermissionDenied)
    def test_attachment_requires_share_authorization_before_file_access(self, authorize, server, stream):
        request = RequestFactory().get('/images/', {'filename': 'photo.png'})
        response = shared.shared_whiteboard(request, 'abcd', PARENT, BOARD, 'image')
        self.assertEqual(response.status_code, 403)
        server.assert_not_called()
        stream.assert_not_called()

    @patch.object(shared, 'image_stream')
    @patch.object(shared, 'server_read')
    @patch.object(shared, 'authorize_share')
    def test_image_request_rejects_missing_or_mixed_selectors(self, authorize, server, stream):
        authorize.return_value = self.context
        for params in ({}, {'filename': 'photo.png', 'path': '/images/photo.png'}):
            with self.subTest(params=params):
                request = RequestFactory().get('/images/', params)
                response = shared.shared_whiteboard(request, 'abcd', PARENT, BOARD, 'image')
                self.assertEqual(response.status_code, 403)
        server.assert_not_called()
        stream.assert_not_called()

    @patch.object(shared, 'resource')
    @patch.object(shared, 'image_stream')
    @patch.object(shared, 'server_read')
    @patch.object(shared, 'authorize_share')
    def test_traversal_filename_does_not_read_file(self, authorize, server, stream, resource):
        authorize.return_value = self.context
        server.return_value = {'elements': [{'type': 'image', 'filename': 'allowed.png'}]}
        request = RequestFactory().get('/images/', {'filename': '../private.png'})
        self.assertEqual(shared.shared_whiteboard(request, 'abcd', PARENT, BOARD, 'image').status_code, 403)
        resource.assert_not_called()
        stream.assert_not_called()

    @patch.object(shared, 'image_stream')
    @patch.object(shared, 'image_resource')
    @patch.object(shared, 'get_service_url', return_value='https://seafile.test')
    @patch.object(shared, 'server_read')
    @patch.object(shared, 'authorize_share')
    def test_library_image_request_uses_original_path_parameter(self, authorize, server, service, resource, stream):
        authorize.return_value = self.context
        element = {'type': 'image', 'dataURL': 'https://seafile.test/lib/%s/file/images/photo.png?raw=1' % REPO}
        server.return_value = {'elements': [element]}
        resource.return_value = (self.context[2], '/images/photo.png', 'image-id', 'image/png')
        stream.return_value = JsonResponse({})
        request = RequestFactory().get('/images/', {'path': '/images/photo.png'})
        self.assertEqual(shared.shared_whiteboard(request, 'abcd', PARENT, BOARD, 'image').status_code, 200)
        self.assertEqual(resource.call_args.args[0], element)


class SharedWhiteboardAPIClassTest(SimpleTestCase):
    def request(self, method='get', data=None):
        request = getattr(APIRequestFactory(), method)('/whiteboard/', data or {})
        request.user = AnonymousUser()
        request.session = {'visited_fs_abcd': True}
        return request

    @patch.object(SharedSdocWhiteboard, 'throttle_classes', ())
    @patch('seahub.exdraw.apis.shared_whiteboard')
    def test_scene_class_preserves_anonymous_share_session(self, gateway):
        gateway.return_value = JsonResponse({'scene': {}})
        response = SharedSdocWhiteboard.as_view()(
            self.request(), share_token='abcd', sdoc_uuid=PARENT, file_uuid=BOARD, action='scene')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(gateway.call_args.args[0].session['visited_fs_abcd'])
        self.assertEqual(gateway.call_args.args[1:], ('abcd', PARENT, BOARD, 'scene'))

    @patch.object(SharedSdocWhiteboardImage, 'throttle_classes', ())
    @patch('seahub.exdraw.apis.shared_whiteboard')
    def test_image_class_passes_filename_and_uses_image_action(self, gateway):
        gateway.return_value = JsonResponse({})
        response = SharedSdocWhiteboardImage.as_view()(
            self.request(data={'filename': 'photo.png'}), share_token='abcd', sdoc_uuid=PARENT, file_uuid=BOARD)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(gateway.call_args.args[0].GET['filename'], 'photo.png')
        self.assertEqual(gateway.call_args.args[-1], 'image')

    @patch.object(SharedSdocWhiteboard, 'throttle_classes', ())
    @patch('seahub.exdraw.apis.shared_whiteboard')
    def test_write_methods_are_not_exposed(self, gateway):
        response = SharedSdocWhiteboard.as_view()(
            self.request('post'), share_token='abcd', sdoc_uuid=PARENT, file_uuid=BOARD, action='scene')
        self.assertEqual(response.status_code, 405)
        gateway.assert_not_called()
