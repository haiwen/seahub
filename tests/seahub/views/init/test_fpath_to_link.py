# encoding: utf-8
from seahub.test_utils import BaseTestCase
from seahub.views import fpath_to_link
from urllib.parse import quote


class FpathToLinkTest(BaseTestCase):
    def test_fpath_to_link(self):
        path = '/海文/'
        resp = fpath_to_link(self.repo.id, path, is_dir=True)
        url = '/library/%(repo_id)s/%(repo_name)s/%(path)s' % {'repo_id': self.repo.id,
                                    'repo_name': self.repo.name,
                                    'path': path.strip('/')}

        assert quote(url) in resp
