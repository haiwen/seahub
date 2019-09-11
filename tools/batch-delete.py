#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2012-2016 Seafile Ltd.

import os
import sys
import MySQLdb

import settings

try:
    dbname = os.environ['DBNAME']
    dbuser = os.environ['DBUSER']
    dbpasswd = os.environ['DBPASSWD']
except:
    sys.stderr.write('Environment not set! Exit\n')
    sys.exit(1)

def check_settings():
    if settings.DATABASE_ENGINE == 'mysql':
        sys.stderr.write('[ERROR] Current settings is mysql, need sqlite settings\n')
        sys.exit(1)
        
def do_create():
    root_passwd = input("Please enter root password to create database %s: " % dbname)

    conn = MySQLdb.Connect(host='localhost', user='root', passwd=root_passwd)
    cursor = conn.cursor()

    create_cmd = ( "CREATE DATABASE IF NOT EXISTS `%s` default charset utf8 COLLATE utf8_general_ci;") % (dbname)
    grant_cmd = ("grant all privileges on %s.* to '%s'@localhost identified by '%s';") % (dbname, dbuser, dbpasswd)
    
    try:
        cursor.execute(create_cmd)
        cursor.execute(grant_cmd)
    except:
        pass

    cursor.close()
    conn.close()
    
def do_delete(prefix):
        cmd = ('echo "select concat(\'drop table \',  table_name ,\';\') from TABLES where TABLE_SCHEMA =\'%s\' and table_name like \'%s_%%\' ;" | mysql -u %s -p%s information_schema | sed -n \'2,$p\' | mysql -u %s -p%s %s') % (dbname, prefix, dbuser, dbpasswd, dbuser, dbpasswd, dbname)
        try:
            output = os.popen(cmd).read()
        except:
            pass
    
if __name__=="__main__":
    # check current settings.py
    check_settings()
    
    # create database if not exists
    do_create()

    # detele all seahub tables 
    for app in settings.INSTALLED_APPS:
        app_name = app.split('.')[-1]
        do_delete(app_name)
    do_delete('django')
    
    print('[Delete seahub tables...Done]')
        
