# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

INVITATIONS_TOKEN_AGE = getattr(settings, 'INVITATIONS_TOKEN_AGE', 72)  # hours
