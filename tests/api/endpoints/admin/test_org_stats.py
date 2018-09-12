from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False


class AdminOrgStatsTrafficTest(BaseTestCase):
    def test_get(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-org-stats-traffic', args=[1])
        url += '?start=2017-06-01 07:00:00&end=2017-06-03 07:00:00'

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
