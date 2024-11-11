# -*- coding: utf-8 -*-
import os
import configparser

import pymysql
pymysql.install_as_MySQLdb()


install_path = os.path.dirname(os.path.abspath(__file__))
top_dir = os.path.dirname(install_path)
seafile_conf = os.path.join(top_dir, 'conf', 'seafile.conf')

sql = "INSERT IGNORE INTO EmailUser (email, passwd, is_staff, is_active, ctime) SELECT email, '!', is_staff, is_active, REPLACE(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(6)),'.','') FROM LDAPUsers"


def migrate_ldapusers():
    print('Start migrate LDAPUsers')

    config = configparser.ConfigParser()
    try:
        config.read(seafile_conf)
        db_user = config.get('database', 'user')
        db_host = config.get('database', 'host')
        db_port = config.getint('database', 'port')
        db_password = config.get('database', 'password')
        db_name = os.environ.get('SEAFILE_MYSQL_DB_CCNET_DB_NAME', '') or 'ccnet_db'
    except Exception as e:
        print("Failed to read seafile config file %s: %s" % (seafile_conf, e))
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
