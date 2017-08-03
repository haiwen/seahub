from seahub.tags.models import FileUUIDMap
from seahub.test_utils import BaseTestCase

from seaserv import seafile_api


class FileUUIDMapManagerTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(name='test-repo', desc='',
                                                  username=self.user.username,
                                                  passwd=None))

    def test_get_fileuuid_by_uuid(self):
        args = (self.repo.id, '/', 'dev', True)
        uuid_obj = FileUUIDMap.objects.get_or_create_fileuuidmap(*args)
        uuidmap_obj = FileUUIDMap.objects.get_fileuuidmap_by_uuid(uuid_obj.uuid)
        assert uuid_obj == uuidmap_obj

    def test_create(self):
        args = (self.repo.id, '/', 'dev_create', True)
        uuidmap_obj = FileUUIDMap.objects.get_or_create_fileuuidmap(*args)
        data = (uuidmap_obj.repo_id, uuidmap_obj.parent_path, uuidmap_obj.filename, uuidmap_obj.is_dir)
        assert args == data

    def test_file_uuidmap_by_path(self):
        args = (self.repo.id, '/', 'dev_by_path', True)
        assert None == FileUUIDMap.objects.get_fileuuidmap_by_path(*args)
        uuidmap_obj = FileUUIDMap.objects.get_or_create_fileuuidmap(*args)
        assert uuidmap_obj == FileUUIDMap.objects.get_fileuuidmap_by_path(*args)
        
