from seaserv import seafile_api

from seahub.views.file import get_file_content_by_commit_and_path
from seahub.test_utils import BaseTestCase

class GetFileContentByCommitAndPathTest(BaseTestCase):
    def test_can_get(self):
        path = self.create_file_with_content('foo', content='junk content')
        cmmt_id = seafile_api.get_repo(self.repo.id).head_cmmt_id

        ret_content, err = get_file_content_by_commit_and_path(
            self.fake_request, self.repo.id, cmmt_id, path, 'auto')

        assert ret_content == 'junk content'
        assert err == ''
