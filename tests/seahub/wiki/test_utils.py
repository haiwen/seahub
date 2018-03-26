# -*- coding: utf-8 -*-
from seaserv import seafile_api

from seahub.wiki.models import Wiki
from seahub.wiki.utils import is_valid_wiki_name, get_wiki_page_object
from seahub.test_utils import BaseTestCase


class TestIsValidWikiName(BaseTestCase):
    def test_valid_name(self):
        assert is_valid_wiki_name('a -_123') is True
        assert is_valid_wiki_name(u'维基 abc') is True

    def test_invalid_name(self):
        assert is_valid_wiki_name('aa/.') is False
        assert is_valid_wiki_name(' ') is False


class TestGetWikiPageObject(BaseTestCase):
    def test_get(self):
        wiki = Wiki.objects.add('new wiki', self.user.username)
        assert wiki is not None

        seafile_api.post_empty_file(wiki.repo_id, '/',
                                    'home.md', self.user.username)

        p = get_wiki_page_object(wiki, 'home')
        assert p['updated_at'] is not None
        assert p['last_modifier_name'] is not None
