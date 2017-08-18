# Copyright (c) 2012-2016 Seafile Ltd.
import django.dispatch

# Use org_id = -1 if it's not an org repo
repo_created = django.dispatch.Signal(providing_args=["org_id", "creator", "repo_id", "repo_name", "library_template"])
repo_deleted = django.dispatch.Signal(providing_args=["org_id", "usernames", "repo_owner", "repo_id", "repo_name"])
upload_file_successful = django.dispatch.Signal(providing_args=["repo_id", "file_path", "owner"])
comment_file_successful = django.dispatch.Signal(providing_args=["repo", "file_path", "comment", "author", "notify_users"])
rename_dirent_successful = django.dispatch.Signal(providing_args=["src_repo_id", "src_parent_dir",
                                                                  "src_filename", "dst_repo_id",
                                                                  "dst_parent_dir", "dst_filename", "is_dir"])
institution_deleted = django.dispatch.Signal(providing_args=["inst_name"])
