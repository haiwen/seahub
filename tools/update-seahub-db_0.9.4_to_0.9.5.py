#!/usr/bin/env python
# encoding: utf-8

import sqlite3

conn = sqlite3.connect('/home/xiez/seahub/seahub.db')

c = conn.cursor()

# Create index
c.execute('''CREATE INDEX IF NOT EXISTS "group_groupmessage_425ae3c4" ON "group_groupmessage" ("group_id")''')

c.execute('''CREATE UNIQUE INDEX IF NOT EXISTS "contacts_contact_493fs4f1" ON "contacts_contact" ("user_email", "contact_email")''')

c.close()
