from django.conf import settings
from django.db import connection

from seahub.base.database_storage import DatabaseStorage
from seahub.test_utils import BaseTestCase


class DatabaseStorageTest(BaseTestCase):
    def setUp(self):
        connection.cursor().execute('''CREATE TABLE IF NOT EXISTS `avatar_uploaded` (`filename` TEXT NOT NULL, `filename_md5` CHAR(32) NOT NULL PRIMARY KEY, `data` MEDIUMTEXT NOT NULL, `size` INTEGER NOT NULL, `mtime` datetime NOT NULL);''')
        self.dbs_options = {
            'table': 'avatar_uploaded',
            'base_url': '%simage-view/' % settings.SITE_ROOT,
            'name_column': 'filename',
            'data_column': 'data',
            'size_column': 'size',
        }

    def tearDown(self):
        connection.cursor().execute("DROP TABLE `avatar_uploaded`;")

    def test__save(self):
        storage = DatabaseStorage(options=self.dbs_options)
        ret = storage._save('name', open(__file__))
        assert ret == 'name'

    def test_exists(self):
        storage = DatabaseStorage(options=self.dbs_options)
        assert storage.exists('name') is False

        ret = storage._save('name', open(__file__))
        assert ret == 'name'

        assert storage.exists('name') is True

    def test_delete(self):
        storage = DatabaseStorage(options=self.dbs_options)
        ret = storage._save('name', open(__file__))
        assert ret == 'name'

        storage.delete('name')
        assert storage.exists('name') is False

    def test_size(self):
        storage = DatabaseStorage(options=self.dbs_options)
        storage._save('name', open(__file__))

        assert storage.size('name') > 0

    def test_modified_time(self):
        storage = DatabaseStorage(options=self.dbs_options)
        storage._save('name', open(__file__))

        assert storage.modified_time('name') is not None
