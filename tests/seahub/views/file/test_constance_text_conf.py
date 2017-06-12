from mock import patch
from django.core.urlresolvers import reverse
import requests

from constance import config

from seahub.test_utils import BaseTestCase

import datetime

class DefaultText(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.text = self.create_file(repo_id=self.repo.id,
                                    parent_dir='/',
                                    filename='test.az',
                                    username=self.user.username)

    def test_can_useful(self):
        self.clear_cache()
        setattr(config, 'TEXT_PREVIEW_EXT', '')
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id,
            self.text
            ]))
        assert resp.context['err'] == 'invalid extension'
        setattr(config, 'TEXT_PREVIEW_EXT', 'az')
        resp = self.client.get(reverse('view_lib_file', args=[
            self.repo.id,
            self.text
            ]))
        assert resp.context['err'] == ''
