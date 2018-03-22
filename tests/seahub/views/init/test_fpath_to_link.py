from seahub.test_utils import BaseTestCase
from seahub.views import fpath_to_link


class FpathToLinkTest(BaseTestCase):
    def test_fpath_to_link(self):
        path = '/'
        resp = fpath_to_link(self.repo.id, path, is_dir=True)
        assert '/#common/lib/%(repo_id)s/%(path)s' % {'repo_id': self.repo.id,
                                    'path': path.encode('utf-8').strip('/')} in resp
