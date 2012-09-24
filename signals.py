import django.dispatch

repo_created = django.dispatch.Signal(providing_args=["creator", "repo_id", "repo_name"])
repo_deleted = django.dispatch.Signal(providing_args=["usernames", "repo_owner", "repo_id", "repo_name"])
