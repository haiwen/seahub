# -*- coding: utf-8 -*-
import os
import configparser

import pymysql
pymysql.install_as_MySQLdb()


install_path = os.path.dirname(os.path.abspath(__file__))
top_dir = os.path.dirname(install_path)
central_config_dir = os.path.join(top_dir, 'conf')

sql = "INSERT IGNORE INTO EmailUser (email, passwd, is_staff, is_active, ctime) SELECT email, '!', is_staff, is_active, REPLACE(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(6)),'.','') FROM LDAPUsers"

def load_env_file():
    file_path = os.path.join(central_config_dir, ".env")
    if not os.path.exists(file_path):
        return
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                os.environ[key] = value

load_env_file()

def migrate_ldapusers():
    print('Start migrate LDAPUsers')

    try:
        db_user = os.environ.get('SEAFILE_MYSQL_DB_USER', 'seafile')
        db_host = os.environ.get('SEAFILE_MYSQL_DB_HOST', 'db')
        db_port = int(os.environ.get('SEAFILE_MYSQL_DB_PORT', 3306))
        db_password = os.environ.get('SEAFILE_MYSQL_DB_PASSWORD')
        db_name = os.environ.get('SEAFILE_MYSQL_DB_CCNET_DB_NAME', 'ccnet_db')
    except Exception as e:
        print('Failed to init ccnet db: %s' % e)
        return

    try:
        conn = pymysql.connect(user=db_user, host=db_host, port=db_port, password=db_password, database=db_name)
        conn.autocommit(True)
        cursor = conn.cursor()
    except Exception as e:
        print('Failed to connect to mysql database: %s' % e)
        return

    try:
        cursor.execute(sql)
        print('Migrated %s records' % cursor.rowcount)
        print('Finish migrate LDAPUsers.')
    except Exception as e:
        print('Failed to exec sql: %s' % e)
        return
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == '__main__':
    migrate_ldapusers()
