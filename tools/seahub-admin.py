#!/usr/bin/env python
# encoding: utf-8
# Copyright (c) 2012-2016 Seafile Ltd.

import sqlite3
import os
import sys
import time
import hashlib
import getpass

# Get .ccnet directory from argument or user input
if len(sys.argv) >= 2:
    ccnet_dir = sys.argv[1]
else:    
    home_dir = os.path.join(os.path.expanduser('~'), '.ccnet')
    ccnet_dir = input("Enter ccnet directory:(leave blank for %s) " % home_dir)
    if not ccnet_dir:
        ccnet_dir = home_dir

# Test usermgr.db exists
usermgr_db = os.path.join(ccnet_dir, 'PeerMgr/usermgr.db')
if not os.path.exists(usermgr_db):
    print('%s DOES NOT exist. FAILED' % usermgr_db)
    sys.exit(1)

# Connect db
conn = sqlite3.connect(usermgr_db)

# Get cursor
c = conn.cursor()

# Check whether admin user exists
sql = "SELECT email FROM EmailUser WHERE is_staff = 1"
try:
    c.execute(sql)
except sqlite3.Error as e:
    print("An error orrured:", e.args[0])
    sys.exit(1)

staff_list = c.fetchall()
if staff_list:
    print("Admin is already in database. Email as follows: ")
    print('--------------------')
    for e in staff_list:
        print(e[0])
    print('--------------------')
    choice = input('Previous admin would be deleted, would you like to continue?[y/n] ')
    if choice == 'y':
        sql = "DELETE FROM EmailUser WHERE is_staff = 1"
        try:
            c.execute(sql)
        except sqlite3.Error as e:
            print("An error orrured:", e.args[0])
            sys.exit(1)
        else:
            print('Previous admin is deleted.')
    else:
        conn.close()
        sys.exit(0)

# Create admin user
choice = input('Would you like to create admin user?[y/n]')
if choice != 'y':
    conn.close()
    sys.exit(0)

username = input('E-mail address:')
passwd = getpass.getpass('Password:')
passwd2 = getpass.getpass('Password (again):')
if passwd != passwd2:
    print("Two passwords NOT same.")
    sys.exit(1)
    
mySha1 = hashlib.sha1()
mySha1.update(passwd.encode('utf-8'))
enc_passwd = mySha1.hexdigest()
sql = "INSERT INTO EmailUser(email, passwd, is_staff, is_active, ctime) VALUES ('%s', '%s', 1, 1, '%d');" % (username, enc_passwd, time.time()*1000000)
try:
    c = conn.cursor()
    c.execute(sql)
    conn.commit()
except sqlite3.Error as e:
    print("An error occured:", e.args[0])
    sys.exit(1)
else:
    print("Admin user created successfully.")
    
# Close db    
conn.close()

