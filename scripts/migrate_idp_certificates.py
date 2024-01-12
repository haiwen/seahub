# -*- coding: utf-8 -*-
import os
import sys

import pymysql
pymysql.install_as_MySQLdb()

install_path = os.path.dirname(os.path.abspath(__file__))
top_dir = os.path.dirname(install_path)
central_config_dir = os.path.join(top_dir, 'conf')
sys.path.insert(0, central_config_dir)

try:
    from seahub_settings import DATABASES
except ImportError:
    raise RuntimeError("Can not import seahub settings.")

try:
    from seahub_settings import SAML_CERTS_DIR
except ImportError:
    SAML_CERTS_DIR = '/opt/seafile/seahub-data/certs'


def init_db_connect():
    try:
        db_conf = DATABASES['default']
    except KeyError:
        raise RuntimeError('Failed to init seahub db, can not find db info in seahub settings.')

    if db_conf.get('ENGINE') != 'django.db.backends.mysql':
        raise RuntimeError('Failed to init seahub db, only mysql db supported.')

    db_name = db_conf.get('NAME')
    if not db_name:
        raise RuntimeError('Failed to init seahub db, db name is not setted.')

    db_user = db_conf.get('USER')
    if not db_user:
        raise RuntimeError('Failed to init seahub db, db user is not setted.')

    db_passwd = db_conf.get('PASSWORD')
    db_host = db_conf.get('HOST', '127.0.0.1')
    db_port = int(db_conf.get('PORT', '3306'))

    try:
        conn = pymysql.connect(host=db_host, port=db_port, user=db_user,
                               passwd=db_passwd, db=db_name, charset='utf8')
        conn.autocommit(True)
        cursor = conn.cursor()
        return conn, cursor
    except Exception as e:
        raise Exception('Failed to init seahub db: %s.' % e)


def main():
    if not SAML_CERTS_DIR:
        raise RuntimeError('SAML_CERTS_DIR is not set.')

    conn, cursor = init_db_connect()
    query_sql = 'SELECT `org_id` FROM `org_saml_config`'
    try:
        cursor.execute(query_sql)
        res = cursor.fetchall()
    except Exception as e:
        raise Exception('Failed to query org_id_list from org_saml_config: %s' % e)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    org_id_list = list()
    for org_id, *_ in res:
        org_id_list.append(org_id)

    print('Start to migrate idp_certificates to database')
    conn, cursor = init_db_connect()
    try:
        for org_id in org_id_list:
            org_certs_dir = os.path.join(SAML_CERTS_DIR, str(org_id))
            cert_file_path = os.path.join(org_certs_dir, 'idp.crt')
            if os.path.exists(org_certs_dir) and os.path.exists(cert_file_path):
                with open(cert_file_path, 'r') as f:
                    idp_certificate = f.read()

            sql = 'UPDATE `org_saml_config` SET idp_certificate=%s WHERE org_id=%s'
            cursor.execute(sql, (idp_certificate, org_id))
    except Exception as e:
        raise Exception('Failed to migrate idp_certificate to database: %s' % e)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    print('Successfully migrated idp_certificates to database.')


if __name__ == '__main__':
    main()
