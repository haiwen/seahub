import django.dispatch

user_message_sent = django.dispatch.Signal(providing_args=["msg"])
