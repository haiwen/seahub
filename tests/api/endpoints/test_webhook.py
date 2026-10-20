import json
import socket
from unittest import TestCase
from unittest.mock import patch

from django.urls import reverse

from seahub.base.models import Webhooks
from seahub.test_utils import BaseTestCase
from seahub.utils import webhook


class WebhookValidationTest(TestCase):
    def test_non_public_dns_answers(self):
        for address in ('127.0.0.1', '10.0.0.1', '169.254.169.254',
                        '100.64.0.1', '224.0.0.1', '240.0.0.1', '::1',
                        'fc00::1', 'fe80::1', 'fec0::1', '2001:db8::1',
                        '::ffff:127.0.0.1', '64:ff9b::7f00:1', '2002:7f00:1::1'):
            family = socket.AF_INET6 if ':' in address else socket.AF_INET
            answer = (family, socket.SOCK_STREAM, socket.IPPROTO_TCP, '', (address, 443))
            with self.subTest(address=address), patch.object(
                    webhook.socket, 'getaddrinfo', return_value=[answer]):
                with self.assertRaises(ValueError):
                    webhook.validate_webhook_url('https://hooks.example/')

    def test_alternative_numeric_hosts(self):
        for host in ('127.1', '2130706433', '0177.0.0.1', '0x7f000001',
                     '[::ffff:127.0.0.1]'):
            with self.subTest(host=host), self.assertRaises(ValueError):
                webhook.validate_webhook_url('http://%s/' % host)

    def test_mixed_dns_answers(self):
        answers = [(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, '', (ip, 443))
                   for ip in ('8.8.8.8', '127.0.0.1')]
        with patch.object(webhook.socket, 'getaddrinfo', return_value=answers):
            with self.assertRaises(ValueError):
                webhook.validate_webhook_url('https://hooks.example/')

    def test_public_destinations(self):
        for address in ('8.8.8.8', '2606:4700:4700::1111'):
            family = socket.AF_INET6 if ':' in address else socket.AF_INET
            answer = (family, socket.SOCK_STREAM, socket.IPPROTO_TCP, '', (address, 443))
            with self.subTest(address=address), patch.object(
                    webhook.socket, 'getaddrinfo', return_value=[answer]):
                webhook.validate_webhook_url('https://hooks.example/path?event=1')

    def test_invalid_urls_and_dns_failure(self):
        for url in (None, {}, '', 'file:///etc/passwd', 'http:///path',
                    'http://user@8.8.8.8/', 'http://8.8.8.8:99999/',
                    'http://8.8.8.8\\@127.0.0.1/', 'http://[fe80::1%25eth0]/',
                    'http://8.8.8.8/\r\npath'):
            with self.subTest(url=url), self.assertRaises(ValueError):
                webhook.validate_webhook_url(url)
        with patch.object(webhook.socket, 'getaddrinfo', side_effect=socket.gaierror()):
            with self.assertRaises(ValueError):
                webhook.validate_webhook_url('https://hooks.example/')


class WebhookTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo_id = self.create_repo(name='webhook-test', desc='',
                                        username=self.user.username, passwd=None)
        self.url = reverse('api-v2.1-webhooks', args=[self.repo_id])

    def tearDown(self):
        Webhooks.objects.filter(repo_id=self.repo_id).delete()
        self.remove_repo(self.repo_id)

    def test_owner_cannot_create_internal_webhook(self):
        for url in ('http://127.0.0.1:8000/', 'http://169.254.169.254/',
                    'http://127.1/', 'http://2130706433/', 'http://[::1]/'):
            response = self.client.post(self.url, {'url': url})
            self.assertEqual(response.status_code, 400)
        self.assertFalse(Webhooks.objects.filter(repo_id=self.repo_id).exists())

    def test_public_webhook_can_be_created_but_not_changed_to_internal(self):
        answer = (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, '', ('8.8.8.8', 443))
        with patch('seahub.utils.webhook.socket.getaddrinfo', return_value=[answer]):
            response = self.client.post(self.url, {'url': 'https://hooks.example/event'})
        self.assertEqual(response.status_code, 200)
        hook = Webhooks.objects.get(repo_id=self.repo_id)
        url = reverse('api-v2.1-webhooks', args=[self.repo_id, hook.id])
        response = self.client.put(url, json.dumps({'url': 'http://127.0.0.1/'}),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 400)
        hook.refresh_from_db()
        self.assertEqual(hook.url, 'https://hooks.example/event')

    def test_permission_check_precedes_dns_lookup(self):
        self.logout()
        self.login_as(self.admin)
        hook = Webhooks.objects.create(repo_id=self.repo_id, url='https://hooks.example/',
                                       creator=self.user.username, settings='{}')
        with patch('seahub.utils.webhook.socket.getaddrinfo') as resolve:
            response = self.client.post(self.url, {'url': 'https://hooks.example/'})
            self.assertEqual(response.status_code, 403)
            response = self.client.put(
                reverse('api-v2.1-webhooks', args=[self.repo_id, hook.id]),
                json.dumps({'url': 'https://hooks.example/'}), content_type='application/json')
            self.assertEqual(response.status_code, 403)
            resolve.assert_not_called()
