# -*- coding: utf-8 -*-
import json

from django.core.urlresolvers import reverse
from seahub.test_utils import BaseTestCase

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False


class AdminFileDetailTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path= self.file
        self.url = reverse('api-v2.1-admin-file-detail', args=[self.repo_id]) + \
                '?path=%s' % self.file_path

    def tearDown(self):
        self.remove_repo()

    def test_get_file_detail(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['id'] is not None
        assert json_resp['last_modified'] is not None
        assert json_resp['last_modifier_email'] is not None
        assert json_resp['last_modifier_name'] is not None
        assert json_resp['last_modifier_contact_email'] is not None
        assert json_resp['mtime'] is not None
        assert json_resp['size'] is not None
        assert json_resp['name'] is not None

    def test_get_file_detail_with_invalid_share_token(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)
