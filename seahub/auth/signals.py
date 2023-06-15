# Copyright (c) 2012-2016 Seafile Ltd.
from django.dispatch import Signal

user_logged_in = Signal()
user_logged_in_failed = Signal()
