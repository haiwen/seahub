# Copyright (c) 2012-2016 Seafile Ltd.
from django.dispatch import Signal

# Use org_id = -1 if it's not an org repo
repo_created = Signal()
repo_deleted = Signal()
repo_transfer = Signal()
clean_up_repo_trash = Signal()
repo_restored = Signal()
upload_file_successful = Signal()
comment_file_successful = Signal()
institution_deleted = Signal()
