import django.dispatch

mail_sended = django.dispatch.Signal(providing_args=["user", "email"])
