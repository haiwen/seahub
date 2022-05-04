from seahub.test_utils import BaseTestCase


class PingTest(BaseTestCase):
    def test_can_ping(self):
        resp = self.client.get('/api2/ping/')
        self.assertEqual(200, resp.status_code)
