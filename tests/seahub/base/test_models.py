from seahub.base.models import FileComment
from seahub.test_utils import BaseTestCase


class FileCommentManagerTest(BaseTestCase):
    def test_can_add(self):
        assert len(FileComment.objects.all()) == 0

        o = FileComment.objects.add(repo_id='xxx', parent_path='/foo/bar',
                                    item_name='test.txt',
                                    author=self.user.username,
                                    comment='test comment')
        assert o.parent_path == '/foo/bar'
        assert len(FileComment.objects.all()) == 1

    def test_get_by_file_path(self):
        o1 = FileComment.objects.add(repo_id='xxx', parent_path='/foo/bar/',
                                     item_name='test.txt',
                                     author=self.user.username,
                                     comment='test comment 1')
        o2 = FileComment.objects.add(repo_id='xxx', parent_path='/foo/bar/',
                                     item_name='test.txt',
                                     author=self.user.username,
                                     comment='test comment 2')
        assert len(FileComment.objects.get_by_file_path('xxx', '/foo/bar/test.txt')) == 2


class FileCommentTest(BaseTestCase):
    def test_normalize_path(self):
        o = FileComment.objects.add(repo_id='xxx', parent_path='/foo/bar/',
                                    item_name='test.txt',
                                    author=self.user.username,
                                    comment='test comment')
        assert o.parent_path == '/foo/bar'

    def test_can_save(self):
        assert len(FileComment.objects.all()) == 0

        FileComment(repo_id='xxx', parent_path='/foo/bar/',
                    item_name='test.txt', author=self.user.username,
                    comment='test comment').save()

        assert len(FileComment.objects.all()) == 1
