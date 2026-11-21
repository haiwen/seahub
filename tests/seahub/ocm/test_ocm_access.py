import json
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

from django.urls import reverse
from requests.exceptions import ConnectTimeout
from rest_framework.test import APIRequestFactory, force_authenticate

from seahub.api2.endpoints import ocm as ocm_endpoint
from seahub.api2.endpoints import ocm_repos as ocm_repos_endpoint

PEER = 'https://peer.example.org/'
LOOPBACK = 'http://127.0.0.1:8082/'
PEER_SERVERS = [{'server_name': 'Peer', 'server_url': PEER}]
PROVIDER_ID = 'a' * 36
REPO_ID = 'b' * 36
USER = SimpleNamespace(username='member@example.org', is_authenticated=True)
_UNSET = object()


def share_body(seafile_service_url):
    return {
        'shareWith': 'someone@example.org',
        'name': 'Payroll 2026',
        'sender': 'ceo@example.invalid',
        'shareType': 'user',
        'resourceType': 'library',
        'providerId': PROVIDER_ID,
        'protocol': {
            'name': ocm_endpoint.OCM_SEAFILE_PROTOCOL,
            'options': {
                'sharedSecret': 'secret123',
                'permissions': ['read'],
                'repoId': REPO_ID,
                'seafileServiceURL': seafile_service_url,
            },
        },
    }


def unshared_body():
    return {
        'notificationType': ocm_endpoint.OCM_NOTIFICATION_SHARE_UNSHARED,
        'resourceType': 'library',
        'providerId': PROVIDER_ID,
        'notification': {'sharedSecret': 'secret123', 'message': ''},
    }


class OCMViewTestCase(TestCase):
    """Drive the OCM views through the URL configuration, with OCM settings patched."""

    def setUp(self):
        self.factory = APIRequestFactory()
        for view in (ocm_endpoint.OCMSharesView, ocm_endpoint.OCMNotificationsView,
                     ocm_endpoint.OCMSharesPrepareView, ocm_endpoint.OCMShareReceivedView,
                     ocm_repos_endpoint.OCMReposDirView):
            patcher = patch.object(view, 'throttle_classes', ())
            patcher.start()
            self.addCleanup(patcher.stop)

    def patch_endpoint(self, target, name, new=_UNSET):
        if new is _UNSET:
            patcher = patch.object(target, name)
        else:
            patcher = patch.object(target, name, new)
        mocked = patcher.start()
        self.addCleanup(patcher.stop)
        return mocked

    def allow_peer(self):
        self.patch_endpoint(ocm_endpoint, 'OCM_REMOTE_SERVERS', PEER_SERVERS)

    def call(self, view, url_name, method='post', body=None, kwargs=None, authenticated=True):
        kwargs = kwargs or {}
        url = reverse(url_name, kwargs=kwargs)
        if method == 'post':
            request = self.factory.post(url, body, format='json')
        elif method == 'delete':
            request = self.factory.delete(url)
        else:
            request = self.factory.get(url)
        if authenticated:
            force_authenticate(request, user=USER)
        return view.as_view()(request, **kwargs)


class OCMDisabledTest(OCMViewTestCase):

    def test_ocm_endpoints_are_unavailable_when_ocm_is_disabled(self):
        self.patch_endpoint(ocm_endpoint, 'ENABLE_OCM', False)
        self.patch_endpoint(ocm_repos_endpoint, 'ENABLE_OCM', False)
        received = self.patch_endpoint(ocm_endpoint, 'OCMShareReceived')
        repos_received = self.patch_endpoint(ocm_repos_endpoint, 'OCMShareReceived')
        posted = self.patch_endpoint(ocm_endpoint, 'requests').post
        record = Mock()
        record.to_user = USER.username
        received.objects.get.return_value = record
        repos_received.objects.filter.return_value = [record]

        cases = (
            (ocm_endpoint.OCMSharesView, 'api-v2.1-ocm-shares', 'post', share_body(PEER), {}),
            (ocm_endpoint.OCMNotificationsView, 'api-v2.1-ocm-notifications', 'post',
             unshared_body(), {}),
            (ocm_endpoint.OCMShareReceivedView, 'api-v2.1-ocm-share-received', 'delete',
             None, {'pk': 1}),
            (ocm_repos_endpoint.OCMReposDirView, 'api-v2.1-ocm-repos-dir', 'get', None,
             {'provider_id': PROVIDER_ID, 'repo_id': REPO_ID}),
        )
        for view, url_name, method, body, kwargs in cases:
            with self.subTest(url_name=url_name):
                response = self.call(view, url_name, method, body, kwargs)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.data['error_msg'], 'feature not enabled.')

        received.objects.add.assert_not_called()
        record.delete.assert_not_called()
        posted.assert_not_called()


class OCMSharesViewTest(OCMViewTestCase):

    def setUp(self):
        super().setUp()
        self.patch_endpoint(ocm_endpoint, 'ENABLE_OCM', True)
        self.allow_peer()
        self.received = self.patch_endpoint(ocm_endpoint, 'OCMShareReceived')
        self.received.objects.filter.return_value.exists.return_value = False
        self.patch_endpoint(
            ocm_endpoint, 'Profile'
        ).objects.get_username_by_contact_email.return_value = USER.username

    def test_anonymous_request_from_unregistered_server_is_rejected(self):
        response = self.call(ocm_endpoint.OCMSharesView, 'api-v2.1-ocm-shares',
                             body=share_body(LOOPBACK), authenticated=False)

        self.assertEqual(response.status_code, 403)
        self.received.objects.add.assert_not_called()

    def test_request_from_registered_server_creates_the_record(self):
        response = self.call(ocm_endpoint.OCMSharesView, 'api-v2.1-ocm-shares',
                             body=share_body(PEER), authenticated=False)

        self.assertEqual(response.status_code, 201)
        self.received.objects.add.assert_called_once()
        self.assertEqual(self.received.objects.add.call_args.kwargs['from_server_url'], PEER)


class OCMNotificationsViewTest(OCMViewTestCase):

    def setUp(self):
        super().setUp()
        self.patch_endpoint(ocm_endpoint, 'ENABLE_OCM', True)
        self.allow_peer()
        self.received = self.patch_endpoint(ocm_endpoint, 'OCMShareReceived')

    def record(self, from_server_url):
        record = Mock()
        record.from_server_url = from_server_url
        self.received.objects.get.return_value = record
        return record

    def test_notification_about_unregistered_server_is_rejected(self):
        record = self.record(LOOPBACK)
        response = self.call(ocm_endpoint.OCMNotificationsView, 'api-v2.1-ocm-notifications',
                             body=unshared_body(), authenticated=False)

        self.assertEqual(response.status_code, 403)
        record.delete.assert_not_called()

    def test_notification_about_registered_server_removes_the_record(self):
        record = self.record(PEER)
        response = self.call(ocm_endpoint.OCMNotificationsView, 'api-v2.1-ocm-notifications',
                             body=unshared_body(), authenticated=False)

        self.assertEqual(response.status_code, 200)
        record.delete.assert_called_once()


class OCMShareReceivedViewDeleteTest(OCMViewTestCase):

    def setUp(self):
        super().setUp()
        self.patch_endpoint(ocm_endpoint, 'ENABLE_OCM', True)
        self.allow_peer()
        self.received = self.patch_endpoint(ocm_endpoint, 'OCMShareReceived')
        self.requests = self.patch_endpoint(ocm_endpoint, 'requests')

    def record(self, from_server_url):
        record = Mock()
        record.to_user = USER.username
        record.from_server_url = from_server_url
        record.shared_secret = 'secret123'
        self.received.objects.get.return_value = record
        return record

    def delete(self):
        return self.call(ocm_endpoint.OCMShareReceivedView, 'api-v2.1-ocm-share-received',
                         method='delete', kwargs={'pk': 1})

    def test_record_is_deleted_when_remote_server_is_unreachable(self):
        record = self.record(PEER)
        self.patch_endpoint(ocm_endpoint, 'get_remote_protocol', Mock(side_effect=ConnectTimeout))

        response = self.delete()

        self.assertEqual(response.status_code, 200)
        record.delete.assert_called_once()

    def test_unregistered_server_is_not_contacted(self):
        record = self.record(LOOPBACK)
        protocol = self.patch_endpoint(ocm_endpoint, 'get_remote_protocol')

        response = self.delete()

        self.assertEqual(response.status_code, 200)
        record.delete.assert_called_once()
        protocol.assert_not_called()
        self.requests.post.assert_not_called()


class OCMReposDirViewTest(OCMViewTestCase):

    def setUp(self):
        super().setUp()
        self.patch_endpoint(ocm_repos_endpoint, 'ENABLE_OCM', True)
        self.allow_peer()
        self.received = self.patch_endpoint(ocm_repos_endpoint, 'OCMShareReceived')
        self.requests = self.patch_endpoint(ocm_repos_endpoint, 'requests')

    def record(self, from_server_url):
        record = Mock()
        record.from_server_url = from_server_url
        record.shared_secret = 'secret123'
        self.received.objects.filter.return_value = [record]
        return record

    def get(self):
        return self.call(ocm_repos_endpoint.OCMReposDirView, 'api-v2.1-ocm-repos-dir',
                         method='get', kwargs={'provider_id': PROVIDER_ID, 'repo_id': REPO_ID})

    def test_unregistered_server_is_not_contacted(self):
        self.record(LOOPBACK)

        response = self.get()

        self.assertEqual(response.status_code, 403)
        self.requests.get.assert_not_called()

    def test_request_to_registered_server_has_a_timeout(self):
        self.record(PEER)
        self.requests.get.return_value.text = json.dumps({'items': []})

        response = self.get()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'items': []})
        self.assertEqual(self.requests.get.call_args.args[0],
                         PEER + 'api/v2.1/via-repo-token/dir/')
        self.assertEqual(self.requests.get.call_args.kwargs['timeout'], 30)


class OCMSharesPrepareViewTest(OCMViewTestCase):

    def setUp(self):
        super().setUp()
        self.patch_endpoint(ocm_endpoint, 'ENABLE_OCM', True)
        self.allow_peer()
        self.patch_endpoint(ocm_endpoint, 'seafile_api').get_repo.return_value = Mock()
        self.patch_endpoint(ocm_endpoint, 'get_repo_owner',
                            lambda request, repo_id: USER.username)
        self.patch_endpoint(
            ocm_endpoint, 'OCMShare'
        ).objects.filter.return_value.exists.return_value = False
        self.protocol = self.patch_endpoint(ocm_endpoint, 'get_remote_protocol')
        self.posted = self.patch_endpoint(ocm_endpoint, 'requests').post

    def prepare(self, to_server_url):
        body = {
            'to_user': 'someone@example.org',
            'to_server_url': to_server_url,
            'repo_id': REPO_ID,
            'permission': 'r',
        }
        return self.call(ocm_endpoint.OCMSharesPrepareView, 'api-v2.1-ocm-shares-prepare',
                         body=body)

    def test_unregistered_to_server_url_is_rejected(self):
        response = self.prepare(LOOPBACK)

        self.assertEqual(response.status_code, 403)
        self.protocol.assert_not_called()
        self.posted.assert_not_called()

    def test_endpoint_outside_registered_servers_is_rejected(self):
        self.protocol.return_value = {'endPoint': LOOPBACK}

        response = self.prepare(PEER)

        self.assertEqual(response.status_code, 403)
        self.posted.assert_not_called()
