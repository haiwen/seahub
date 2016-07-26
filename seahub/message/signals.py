# Copyright (c) 2012-2016 Seafile Ltd.
import django.dispatch

user_message_sent = django.dispatch.Signal(providing_args=["msg"])
