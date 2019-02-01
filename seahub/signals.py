# Copyright (c) 2012-2016 Seafile Ltd.
import django.dispatch

# Use org_id = -1 if it's not an org repo
repo_created = django.dispatch.Signal(providing_args=["org_id", "creator", "repo_id", "repo_name", "library_template"])
repo_deleted = django.dispatch.Signal(providing_args=["org_id", "operator", "usernames", "repo_owner", "repo_id", "repo_name"])
repo_transfer = django.dispatch.Signal(providing_args=["org_id", "repo_owner", "to_user", "repo_id", "repo_name"])
clean_up_repo_trash = django.dispatch.Signal(providing_args=["org_id", "operator", "repo_id", "repo_name", "repo_owner", "days"])
repo_restored = django.dispatch.Signal(providing_args=["repo_id", "operator"])
upload_file_successful = django.dispatch.Signal(providing_args=["repo_id", "file_path", "owner"])
comment_file_successful = django.dispatch.Signal(providing_args=["repo", "file_path", "comment", "author", "notify_users"])
institution_deleted = django.dispatch.Signal(providing_args=["inst_name"])
