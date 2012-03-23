#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import sys
import MySQLdb

import settings

try:
    dbname = os.environ['DBNAME']
    dbuser = os.environ['DBUSER']
    dbpasswd = os.environ['DBPASSWD']
except:
    print 'Environment not set! Exit'
    sys.exit(1)

def do_create():
    conn = MySQLdb.Connect(host='localhost', user=dbuser, passwd=dbpasswd)
    cursor = conn.cursor()

    cmd = ( "CREATE DATABASE IF NOT EXISTS `%s` default charset utf8 COLLATE utf8_general_ci;") % (dbname)
    try:
        cursor.execute(cmd)
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
    # create database if not exists
    do_create()

    # detele all seahub tables 
    for app in settings.INSTALLED_APPS:
        app_name = app.split('.')[-1]
        do_delete(app_name)
    do_delete('django')
    
    print '[Delete seahub tables...Done]'
        
