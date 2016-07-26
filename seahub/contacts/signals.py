# Copyright (c) 2012-2016 Seafile Ltd.
import django.dispatch

mail_sended = django.dispatch.Signal(providing_args=["user", "email"])
