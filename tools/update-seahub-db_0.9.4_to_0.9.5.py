#!/usr/bin/env python
# encoding: utf-8
# Copyright (c) 2012-2016 Seafile Ltd.

import sqlite3
import os
import sys

if len(sys.argv) != 2:
    print("usage: update.py <dbname>")
    sys.exit(-1)

if not os.access(sys.argv[1], os.F_OK):
    print(("%s does not exist" % sys.argv[1]))
    sys.exit(-1)

conn = sqlite3.connect(sys.argv[1])

c = conn.cursor()

# Create index
c.execute('''CREATE INDEX IF NOT EXISTS "group_groupmessage_425ae3c4" ON "group_groupmessage" ("group_id")''')

c.execute('''CREATE UNIQUE INDEX IF NOT EXISTS "contacts_contact_493fs4f1" ON "contacts_contact" ("user_email", "contact_email")''')

c.close()
