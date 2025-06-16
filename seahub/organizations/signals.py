# Copyright (c) 2012-2016 Seafile Ltd.
from django.dispatch import Signal

# A new org is created
org_created = Signal()
org_reactivated = Signal()
org_last_activity = Signal()
