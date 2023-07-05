# -*- coding: utf-8 -*-
import os
import configparser

import pymysql


install_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
top_dir = os.path.dirname(install_path)
ccnet_conf = os.path.join(top_dir, 'conf', 'ccnet.conf')

sql = "INSERT INTO EmailUser (email, passwd, is_staff, is_active, ctime) SELECT email, '!', is_staff, is_active, REPLACE(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(6)),'.','') FROM LDAPUsers"


def migrate_ldapusers():
    print('Start migrate LDAPUsers')

    config = configparser.ConfigParser()
    try:
        config.read(ccnet_conf)
        db_user = config.get('Database', 'USER')
        db_host = config.get('Database', 'HOST')
        db_port = config.get('Database', 'PORT')
        db_password = config.get('Database', 'PASSWD')
        db_name = config.get('Database', 'DB')
    except Exception as e:
        print("Failed to read ccnet config file %s: %s" % (ccnet_conf, e))
        return

    try:
        conn = pymysql.connect(user=db_user, host=db_host, port=db_port, password=db_password, database=db_name)
        cursor = conn.cursor()
    except Exception as e:
        print('Failed to connect to mysql database: %s' % e)
        return

    try:
        cursor.execute(sql)
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
