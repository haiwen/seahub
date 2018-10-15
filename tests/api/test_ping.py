from seahub.test_utils import BaseTestCase

class PingTest(BaseTestCase):
    def test_can_ping(self):
        resp = self.client.get('/api2/ping/')
        self.assertEqual(200, resp.status_code)

    def test_html_ping(self):
        headers = {'HTTP_ACCEPT': 'text/html'}
        resp = self.client.get('/api2/ping/', **headers)
        self.assertEqual(200, resp.status_code)
