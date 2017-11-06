import hashlib

from seahub.base.models import FileComment
from seahub.test_utils import BaseTestCase
from seahub.tags.models import FileUUIDMap


class FileCommentManagerTest(BaseTestCase):
    def test_can_add(self):
        assert len(FileComment.objects.all()) == 0

        o = FileComment.objects.add(repo_id='xxx', parent_path='/foo/bar',
                                    item_name='test.txt',
                                    author=self.user.username,
                                    comment='test comment')
        assert o.uuid.parent_path == '/foo/bar'
        assert len(FileComment.objects.all()) == 1

    def test_add_by_file_path(self):
        assert len(FileComment.objects.all()) == 0

        o = FileComment.objects.add_by_file_path(
            repo_id='xxx', file_path='/foo/bar/test.txt',
            author=self.user.username, comment='test comment')

        assert o.uuid.parent_path == '/foo/bar'
        assert len(FileComment.objects.all()) == 1

    def test_get_by_file_path(self):
        o1 = FileComment.objects.add(repo_id='xxx', parent_path='/foo/bar/',
                                     item_name='test.txt',
                                     author=self.user.username,
                                     comment='test comment 1')
        o2 = FileComment.objects.add(repo_id='xxx', parent_path='/foo/bar',
                                     item_name='test.txt',
                                     author=self.user.username,
                                     comment='test comment 2')
        assert len(FileComment.objects.get_by_file_path('xxx', '/foo/bar/test.txt')) == 2

    def test_get_by_parent_path(self):
        o1 = FileComment.objects.add(repo_id='xxx', parent_path='/foo/bar/',
                                     item_name='test1.txt',
                                     author=self.user.username,
                                     comment='comment 1')
        o2 = FileComment.objects.add(repo_id='xxx', parent_path='/foo/bar',
                                     item_name='test2.txt',
                                     author=self.user.username,
                                     comment='comment 2')
        assert len(FileComment.objects.get_by_parent_path('xxx', '/foo/bar/')) == 2
        assert len(FileComment.objects.get_by_parent_path('xxx', '/foo/bar')) == 2


class FileCommentTest(BaseTestCase):
    def test_md5_repo_id_parent_path(self):
        md5 = FileUUIDMap.md5_repo_id_parent_path('xxx', '/')
        assert md5 == hashlib.md5('xxx' + '/').hexdigest()

        md5 = FileUUIDMap.md5_repo_id_parent_path('xxx', '/foo')
        assert md5 == hashlib.md5('xxx' + '/foo').hexdigest()

        md5 = FileUUIDMap.md5_repo_id_parent_path('xxx', '/foo/')
        assert md5 == hashlib.md5('xxx' + '/foo').hexdigest()

    def test_normalize_path(self):
        o = FileComment.objects.add(repo_id='xxx', parent_path='/foo/bar/',
                                    item_name='test.txt',
                                    author=self.user.username,
                                    comment='test comment')
        assert o.uuid.parent_path == '/foo/bar'

    def test_can_save(self):
        assert len(FileComment.objects.all()) == 0
        uuid = FileUUIDMap.objects.get_or_create_fileuuidmap('xxx', '/foo/bar/', 'test.txt', False)
        FileComment(uuid=uuid, author=self.user.username,
                    comment='test comment').save()

        assert len(FileComment.objects.all()) == 1
