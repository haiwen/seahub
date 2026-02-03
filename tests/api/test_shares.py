#coding: UTF-8
from django.core.cache import cache
import pytest
pytestmark = pytest.mark.django_db

from seahub.share.models import FileShare, UploadLinkShare
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class FileSharedLinkApiTest(BaseTestCase):

    def setUp(self):
        cache.clear()
        from constance import config
        self.config = config

        self.curr_passwd_len = self.config.SHARE_LINK_PASSWORD_MIN_LENGTH
        self.config.SHARE_LINK_PASSWORD_MIN_LENGTH = 3

    def tearDown(self):
        self.remove_repo()
        self.config.SHARE_LINK_PASSWORD_MIN_LENGTH = self.curr_passwd_len

    def test_create_file_shared_link_with_invalid_path(self):
        self.login_as(self.user)

        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "ps=%s&type=f" % (self.file),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(400, resp.status_code)

        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "type=f",
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(400, resp.status_code)

        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=f" % randstring(6),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(400, resp.status_code)

    def test_can_create_file_download_link(self):
        self.login_as(self.user)

        # create file download share link
        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=f" % (self.file),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(201, resp.status_code)
        self.assertRegex(resp.headers['location'],
                                 r'http(.*)/f/(\w{10,100})/')

        token = resp.headers['location'].split('/')[-2]
        self.assertIsNotNone(FileShare.objects.get(token=token))

    def test_can_create_file_download_link_with_exipre(self):
        self.login_as(self.user)

        # create file download share link with expire
        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=f&expire=5" % (self.file),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(201, resp.status_code)
        self.assertRegex(resp.headers['location'],
                                 r'http(.*)/f/(\w{10,100})/')

        token = resp.headers['location'].split('/')[-2]
        fileshare = FileShare.objects.get(token=token)
        self.assertIsNotNone(fileshare.expire_date)

    def test_can_create_file_download_link_with_password(self):
        self.login_as(self.user)

        # create file download share link with password
        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=f&password=123" % (self.file),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(201, resp.status_code)
        self.assertRegex(resp.headers['location'],
                                 r'http(.*)/f/(\w{10,100})/')

        token = resp.headers['location'].split('/')[-2]
        fileshare = FileShare.objects.get(token=token)
        self.assertIsNotNone(fileshare.password)

    def test_can_create_file_download_link_with_password_exipre(self):
        self.login_as(self.user)

        # create file download share link with password and expire
        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=f&password=123&expire=5" % (self.file),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(201, resp.status_code)
        self.assertRegex(resp.headers['location'],
                                 r'http(.*)/f/(\w{10,100})/')

        token = resp.headers['location'].split('/')[-2]
        fileshare = FileShare.objects.get(token=token)
        self.assertIsNotNone(fileshare.expire_date)
        self.assertIsNotNone(fileshare.password)

    def test_can_create_dir_download_link(self):
        self.login_as(self.user)

        # create dir download share link
        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=d" % (self.folder),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(201, resp.status_code)
        self.dir_link_location = resp.headers['location']
        self.assertRegex(self.dir_link_location,
                                 r'http(.*)/d/(\w{10,100})/')

        token = resp.headers['location'].split('/')[-2]
        self.assertIsNotNone(FileShare.objects.get(token=token))

    def test_can_create_dir_download_link_with_exipre(self):
        self.login_as(self.user)

        # create dir download share link with expire
        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=d&expire=5" % (self.folder),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(201, resp.status_code)
        self.dir_link_location = resp.headers['location']
        self.assertRegex(self.dir_link_location,
                                 r'http(.*)/d/(\w{10,100})/')

        token = resp.headers['location'].split('/')[-2]
        fileshare = FileShare.objects.get(token=token)
        self.assertIsNotNone(fileshare.expire_date)

    def test_can_create_dir_download_link_with_password(self):
        self.login_as(self.user)

        # create dir download share link with password
        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=d&password=123" % (self.folder),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(201, resp.status_code)
        self.dir_link_location = resp.headers['location']
        self.assertRegex(self.dir_link_location,
                                 r'http(.*)/d/(\w{10,100})/')

        token = resp.headers['location'].split('/')[-2]
        fileshare = FileShare.objects.get(token=token)
        self.assertIsNotNone(fileshare.password)

    def test_can_create_dir_download_link_with_password_exipre(self):
        self.login_as(self.user)

        # create dir download share link with password and expire
        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=d&password=123&expire=5" % (self.folder),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(201, resp.status_code)
        self.dir_link_location = resp.headers['location']
        self.assertRegex(self.dir_link_location,
                                 r'http(.*)/d/(\w{10,100})/')

        token = resp.headers['location'].split('/')[-2]
        fileshare = FileShare.objects.get(token=token)
        self.assertIsNotNone(fileshare.expire_date)
        self.assertIsNotNone(fileshare.password)

    def test_can_create_dir_upload_link(self):
        self.login_as(self.user)

        # create dir download share link
        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=d&share_type=upload" % (self.folder),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(201, resp.status_code)
        self.dir_link_location = resp.headers['location']
        self.assertRegex(self.dir_link_location,
                                 r'http(.*)/u/d/(\w{10,100})/')

        token = resp.headers['location'].split('/')[-2]
        self.assertIsNotNone(UploadLinkShare.objects.get(token=token))

    def test_can_create_dir_upload_link_with_password(self):
        self.login_as(self.user)

        # create dir download share link with password
        resp = self.client.put(
            '/api2/repos/%s/file/shared-link/' % (self.repo.id),
            "p=%s&type=d&share_type=upload&password=123" % (self.folder),
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(201, resp.status_code)
        self.dir_link_location = resp.headers['location']
        self.assertRegex(self.dir_link_location,
                                 r'http(.*)/u/d/(\w{10,100})/')

        token = resp.headers['location'].split('/')[-2]
        uls = UploadLinkShare.objects.get(token=token)
        self.assertIsNotNone(uls.password)


class SharedLinksApiTest(BaseTestCase):

    def tearDown(self):
        self.remove_repo()

    def _add_file_shared_link(self):
        ls = FileShare.objects.create_dir_link(self.user.username,
                self.repo.id, self.folder)

        return ls.token

    def _add_upload_shared_link(self):
        uls = UploadLinkShare.objects.create_upload_link_share(
                self.user.username, self.repo.id, self.folder)

        return uls.token

    def test_can_delete_file_shared_link(self):
        self.login_as(self.user)

        token = self._add_file_shared_link()

        resp = self.client.get(
            '/api2/shared-links/?t=%s' % (token),
        )
        self.assertEqual(200, resp.status_code)

    def test_can_delete_upload_shared_link(self):
        self.login_as(self.user)

        token = self._add_upload_shared_link()

        resp = self.client.get(
            '/api2/shared-links/?t=%s' % (token),
        )
        self.assertEqual(200, resp.status_code)
