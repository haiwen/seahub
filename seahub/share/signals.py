import django.dispatch

share_repo_to_user_successful = django.dispatch.Signal(providing_args=["from_user", "to_user", "repo"])
