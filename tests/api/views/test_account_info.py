import json

from django.core.urlresolvers import reverse
import seaserv
from seaserv import seafile_api

from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class AccountInfoTest(BaseTestCase):
    def test_get(self, ):
        self.login_as(self.user)

        resp = self.client.get('/api2/account/info/')
        self.assertEqual(200, resp.status_code)

    def _do_put(self, val):
        return self.client.put('/api2/account/info/',
                               val, 'application/x-www-form-urlencoded',
        )

    def test_update(self, ):
        self.login_as(self.user)

        resp = self._do_put('name=foo&email_notification_interval=3000')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['email_notification_interval'] == 3000
        assert json_resp['name'] == 'foo'

    def test_update_email_nofification_interval(self, ):
        self.login_as(self.user)

        resp = self._do_put('email_notification_interval=3000')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['email_notification_interval'] == 3000

        resp = self._do_put('email_notification_interval=0')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['email_notification_interval'] == 0
