# encoding: utf-8
from seahub.test_utils import BaseTestCase
from seahub.views import fpath_to_link
from django.utils.http import urlquote


class FpathToLinkTest(BaseTestCase):
    def test_fpath_to_link(self):
        path = '/海文/'.decode('utf-8')
        resp = fpath_to_link(self.repo.id, path, is_dir=True)
        url = '/#common/lib/%(repo_id)s/%(path)s' % {'repo_id': self.repo.id,
                                    'path': path.strip('/')}

        assert urlquote(url, safe='/#') in resp
