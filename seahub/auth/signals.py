# Copyright (c) 2012-2016 Seafile Ltd.
from django.dispatch import Signal

user_logged_in = Signal(providing_args=['request', 'user'])
