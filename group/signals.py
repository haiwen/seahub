import django.dispatch

grpmsg_added = django.dispatch.Signal(providing_args=["group_id", "from_email"])
