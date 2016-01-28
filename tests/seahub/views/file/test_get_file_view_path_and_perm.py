from django.test import RequestFactory

from seaserv import seafile_api

from seahub.views.file import get_file_view_path_and_perm
from seahub.test_utils import BaseTestCase

class GetFileViewPathAndPermTest(BaseTestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()

        # Create an instance of a GET request.
        self.request = self.factory.get('/foo/')

        self.request.user = self.user
        self.request.cloud_mode = False

    def test_can_get(self):
        obj_id = seafile_api.get_file_id_by_path(self.repo.id, self.file)

        rst = get_file_view_path_and_perm(self.request, self.repo.id, obj_id,
                                          self.file)
        assert '8082' in rst[0]
        assert '8082' in rst[1]
        assert rst[2] == 'rw'
