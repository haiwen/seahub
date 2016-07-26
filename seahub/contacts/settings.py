# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

# Some databases impose limitations to indexes columns (like MySQL InnoDB),
# these limitations won't play nice on `user_email contact_email` key. To
# avoid such error, a value of 150 should work when using MySQL InnoDB which # impose a 450 bytes limit (assuming UTF-8 encoding).
CONTACT_EMAIL_LENGTH = getattr(settings, 'CONTACT_EMAIL_LENGTH', 255)
