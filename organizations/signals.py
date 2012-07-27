import django.dispatch

org_user_added = django.dispatch.Signal(providing_args=["org_id", "from_email", "to_email"])

