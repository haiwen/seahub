from seahub.share.models import FileShare
from seahub.test_utils import BaseTestCase
from seahub.utils import gen_token


class FileShareManagerTest(BaseTestCase):
    def test_create_file_link(self):
        assert len(FileShare.objects.all()) == 0
        FileShare.objects.create_file_link(
            self.user.username, self.repo.id, self.file)
        assert len(FileShare.objects.all()) == 1
        fs = FileShare.objects.all()[0]
        assert fs.is_file_share_link() is True
        assert fs.password is None
        assert fs.permission == FileShare.PERM_VIEW_DL
        assert fs.expire_date is None

    def test_create_view_only_file_link(self):
        assert len(FileShare.objects.all()) == 0
        FileShare.objects.create_file_link(
            self.user.username, self.repo.id, self.file,
            permission=FileShare.PERM_VIEW_ONLY)
        assert len(FileShare.objects.all()) == 1
        fs = FileShare.objects.all()[0]
        assert fs.permission == FileShare.PERM_VIEW_ONLY

    def test_create_dir_link(self):
        assert len(FileShare.objects.all()) == 0
        FileShare.objects.create_dir_link(
            self.user.username, self.repo.id, self.folder)
        assert len(FileShare.objects.all()) == 1
        fs = FileShare.objects.all()[0]
        assert fs.is_dir_share_link() is True
        assert fs.password is None
        assert fs.permission == FileShare.PERM_VIEW_DL
        assert fs.expire_date is None

    def test_create_view_only_dir_link(self):
        assert len(FileShare.objects.all()) == 0
        FileShare.objects.create_dir_link(
            self.user.username, self.repo.id, self.folder,
            permission=FileShare.PERM_VIEW_ONLY)
        assert len(FileShare.objects.all()) == 1
        fs = FileShare.objects.all()[0]
        assert fs.permission == FileShare.PERM_VIEW_ONLY


class FileShareTest(BaseTestCase):
    def test_is_file_share_link(self):
        fs = FileShare.objects.create(
            username=self.user.username, repo_id=self.repo.id, path=self.file,
            token=gen_token(10))

        assert fs.is_file_share_link() is True
