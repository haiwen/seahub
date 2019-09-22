import os.path
import tempfile
import sqlite3
import logging
try:  # Py2 and Py3 compatibility
    from urllib import urlretrieve
except:
    from urllib.request import urlretrieve
from seaserv import seafile_api
from seaserv import get_file_id_by_path, get_repo
from seahub.utils import gen_inner_file_get_url

logger = logging.getLogger(__name__)

class DBConnection:
    """Manage the DB connection"""

    def __init__(self, repo_id, path):
        self.conn = None
        repo = get_repo(repo_id)
        file_id = get_file_id_by_path(repo_id, path)
        token = seafile_api.get_fileserver_access_token(
            repo.id, file_id, 'view', '', use_onetime=False)
        if not token:
            return

        # Get inner path in seafile
        inner_path = gen_inner_file_get_url(token, os.path.basename(path))
        self.inner_path = inner_path
        tmp_file = os.path.join(tempfile.gettempdir(), file_id)
        # Download the file from seafile into temp directory
        urlretrieve(inner_path, tmp_file)
        self.conn = sqlite3.connect(tmp_file)

    def close(self):
        if self.conn:
            self.conn.close()


class DBQuery:
    """Execute the query task with connection, the app will just use the SELECT"""

    def __init__(self, conn):
        """
        Init
        :param conn: The sqlite connection object
        """
        self.cursor = conn.cursor()
        self.table = None

    @property
    def tables(self):
        """
        Get all tables in database
        :return: table list
        """
        self.cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = self.cursor.fetchall()
        return [table[0] for table in tables]

    @property
    def columns(self):
        if not self.table:
            return []
        self.cursor.execute('pragma table_info(%s)' % self.table)
        col_name = self.cursor.fetchall()
        col_name = [x[1] for x in col_name]
        return col_name

    @property
    def count(self):
        if not self.table:
            return 0
        self.cursor.execute("select count(*) from %s" % self.table)
        total_data = self.cursor.fetchone()[0]
        return total_data

    def query_data(self, table, page, per_page):
        """
        Get data from table
        :param table: Which table
        :param page: Which page is querying
        :param per_page: How many data per page
        :return: datas in table
        """
        index = (page-1) * per_page
        self.cursor.execute("SELECT * FROM '%s' LIMIT %d OFFSET %d" % (table, per_page, index))
        self.table = table
        datas = self.cursor.fetchall()
        return datas
