# Copyright (c) 2012-2016 Seafile Ltd.
import django.dispatch

# Use org_id = -1 if it's not an org repo
repo_created = django.dispatch.Signal(providing_args=["org_id", "creator", "repo_id", "repo_name", "library_template"])
repo_deleted = django.dispatch.Signal(providing_args=["org_id", "usernames", "repo_owner", "repo_id", "repo_name"])
upload_file_successful = django.dispatch.Signal(providing_args=["repo_id", "file_path", "owner"])
comment_file_successful = django.dispatch.Signal(providing_args=["repo", "file_path", "comment", "author", "notify_users"])
