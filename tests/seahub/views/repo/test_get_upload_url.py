from seahub.views.repo import get_upload_url
from seahub.test_utils import BaseTestCase

class GetUploadUrlTest(BaseTestCase):
    def test_can_get(self):
        rst = get_upload_url(self.fake_request, self.repo.id)
        assert '8082' in rst
