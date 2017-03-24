# Copyright (c) 2012-2017 Seafile Ltd.
import django.dispatch

admin_operation = django.dispatch.Signal(providing_args=["admin_name", "operation", "detail"])
