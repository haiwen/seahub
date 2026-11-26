import sqlite3
from contextlib import closing
from unittest.mock import MagicMock

import pytest

from seahub.utils import db_api


@pytest.fixture
def sqlite_data_dir(monkeypatch, tmp_path):
    config_dir = tmp_path / 'config'
    data_dir = tmp_path / 'core #data'
    config_dir.mkdir()
    data_dir.mkdir()
    (config_dir / 'seafile.conf').write_text('[database]\ntype = sqlite\n', encoding='utf-8')
    monkeypatch.setenv('SEAFILE_CENTRAL_CONF_DIR', str(config_dir))
    monkeypatch.setenv('SEAFILE_DATA_DIR', str(data_dir))
    monkeypatch.delenv('SEAFILE_MYSQL_DB_SEAFILE_DB_NAME', raising=False)
    return data_dir


def test_sqlite_hidden_paths_use_the_core_database(sqlite_data_dir):
    with closing(sqlite3.connect(sqlite_data_dir / 'seafile.db')) as db:
        db.executescript("""
            CREATE TABLE FolderUserPerm (repo_id, path, permission, user);
            CREATE TABLE FolderGroupPerm (repo_id, path, permission, group_id);
            INSERT INTO FolderUserPerm VALUES
                ('repo', '/private', 'invisible', 'member@example.test'),
                ('repo', '/public', 'r', 'member@example.test'),
                ('repo', '/unrelated', 'invisible', 'other@example.test');
            INSERT INTO FolderGroupPerm VALUES
                ('repo', '/team-a', 'invisible', 11),
                ('repo', '/team-b', 'invisible', 12),
                ('repo', '/public', 'r', 11),
                ('repo', '/unrelated', 'invisible', 13);
        """)

    api = db_api.SeafileDB(sqlite_folder_permissions=True)
    assert api.get_share_to_user_invisible_repos_info('member@example.test') == {'repo': {'/private'}}
    assert api.get_share_to_group_invisible_repos_info_by_group_ids([11, 12]) == {'repo': {'/team-a', '/team-b'}}
    assert api.get_share_to_group_invisible_repos_info_by_group_ids([]) == {}


def test_sqlite_hidden_paths_fail_if_the_core_database_is_missing(sqlite_data_dir):
    api = db_api.SeafileDB(sqlite_folder_permissions=True)
    with pytest.raises(sqlite3.OperationalError):
        api.get_share_to_user_invisible_repos_info('member@example.test')
    assert not (sqlite_data_dir / 'seafile.db').exists()


def test_mysql_hidden_paths_keep_qualified_tables_and_bound_values(monkeypatch):
    monkeypatch.setenv('SEAFILE_MYSQL_DB_SEAFILE_DB_NAME', 'existing_seafile')
    connection = MagicMock()
    cursor = connection.cursor.return_value.__enter__.return_value
    cursor.fetchall.return_value = [('repo', '/private')]
    monkeypatch.setattr(db_api, 'connection', connection)

    api = db_api.SeafileDB(sqlite_folder_permissions=True)
    assert api.get_share_to_user_invisible_repos_info('member@example.test') == {'repo': {'/private'}}
    sql, params = cursor.execute.call_args.args
    assert '`existing_seafile`.`FolderUserPerm`' in sql
    assert 'IN (%s)' in sql
    assert params == ('member@example.test',)

    assert api.get_share_to_group_invisible_repos_info_by_group_ids([11, 12]) == {'repo': {'/private'}}
    sql, params = cursor.execute.call_args.args
    assert '`existing_seafile`.`FolderGroupPerm`' in sql
    assert 'IN (%s,%s)' in sql
    assert params == (11, 12)
