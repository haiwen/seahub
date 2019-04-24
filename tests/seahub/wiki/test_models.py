from seahub.wiki.models import Wiki
from seahub.utils.timeutils import dt
from seahub.test_utils import BaseTestCase

from seaserv import seafile_api


class WikiTest(BaseTestCase):
    def test_to_dict(self):
        wiki = Wiki.objects.add('new wiki', self.user.username)

        d = wiki.to_dict()
        assert 'published/new-wiki/' in d['link']
        assert 'new-wiki' == d['slug']
        assert 'T' in d['created_at']
        assert 'T' in d['updated_at']
        seafile_api.remove_repo(wiki.repo_id)


class WikiManagerTest(BaseTestCase):
    def test_add(self):
        wiki = Wiki.objects.add('new wiki', self.user.username)

        assert wiki is not None
        assert wiki.created_at.replace(microsecond=0) <= dt(wiki.updated_at)
