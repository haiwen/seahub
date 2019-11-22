# -*- coding: utf-8 -*-
from seaserv import seafile_api

from seahub.wiki.models import Wiki
from seahub.wiki.utils import is_valid_wiki_name
from seahub.test_utils import BaseTestCase


class TestIsValidWikiName(BaseTestCase):
    def test_valid_name(self):
        assert is_valid_wiki_name('a -_123') is True
        assert is_valid_wiki_name('维基 abc') is True

    def test_invalid_name(self):
        assert is_valid_wiki_name('aa/.') is False
        assert is_valid_wiki_name(' ') is False
