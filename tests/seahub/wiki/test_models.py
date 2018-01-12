from seahub.wiki.models import Wiki
from seahub.test_utils import BaseTestCase

from seaserv import seafile_api

class WikiTest(BaseTestCase):
    def test_to_dict(self):
        wiki = Wiki.objects.add('new wiki', self.user.username)

        d = wiki.to_dict()
        assert 'wikis/new-wiki/' in d['link']
        assert 'T' in d['created_at']
        assert 'T' in d['updated_at']

        # clean
        seafile_api.remove_repo(wiki.repo_id)
