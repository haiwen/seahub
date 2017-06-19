from constance import config
from django.conf import settings

from seahub.utils import get_conf_text_ext
from seahub.test_utils import BaseTestCase


class GetConfTextExtTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()

    def tearDown(self):
        self.clear_cache()

    def test_get(self):
        assert config.TEXT_PREVIEW_EXT == settings.TEXT_PREVIEW_EXT
        orig_preview_ext = settings.TEXT_PREVIEW_EXT

        config.TEXT_PREVIEW_EXT = orig_preview_ext + ',az'
        assert 'az' in get_conf_text_ext()
