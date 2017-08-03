from seahub.tags.models import FileTag, FileUUIDMap
from seahub.test_utils import BaseTestCase

from seaserv import seafile_api


class FileTagManagerTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)
        self.repo = seafile_api.get_repo(self.create_repo(name='test-repo', desc='',
                                                  username=self.user.username,
                                                  passwd=None))

    def test_create_file_tag(self):
        args = (self.repo.id, '/', 'q.q', True, 'test_tag', self.user.username)
        data = FileTag.objects.get_or_create_file_tag(*args)
        assert ('test_tag', True) == (data[0].tag.name, data[1])
        data = FileTag.objects.get_or_create_file_tag(*args)
        assert ('test_tag', False) == (data[0].tag.name, data[1])

    def test_exists_filetag(self):
        uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(self.repo.id, '/', 'q.q', True)
        data = FileTag.objects.exists_filetag(uuid, 'test_exists')
        assert (None, False) == data
        data = FileTag.objects.get_or_create_file_tag(self.repo.id, '/', 'q.q', True, 'test_exists', self.user.username)
        data = FileTag.objects.exists_filetag(uuid, 'test_exists')
        assert ('test_exists', True) == (data[0].tag.name, True)
        
    def test_get_all_file_tag_by_path(self):
        data = FileTag.objects.get_or_create_file_tag(self.repo.id, '/', 'q.2', True, 'test_get_all', self.user.username)
        assert data[0].tag.name in [e.tag.name for e in FileTag.objects.get_all_file_tag_by_path(self.repo.id, '/', 'q.2', True)]

    def test_delete_one(self):
        args = (self.repo.id, '/', 'q.q', True, 'test_tag', self.user.username)
        del_args = (self.repo.id, '/', 'q.q', True, 'test_tag')
        data = FileTag.objects.get_or_create_file_tag(*args)
        assert FileTag.objects.delete_file_tag_by_path(*del_args)

    def test_delete_all(self):
        data = FileTag.objects.get_or_create_file_tag(self.repo.id, '/', 'q.3', True, 'test_get_all', self.user.username)
        FileTag.objects.delete_all_filetag_by_path(self.repo.id, '/', 'q.3', True)
        assert data[0].tag.name not in [e.tag.name for e in FileTag.objects.get_all_file_tag_by_path(self.repo.id, '/', 'q.3', True)]
