# Copyright (c) 2012-2016 Seafile Ltd.
from django.dispatch import Signal

share_repo_to_user_successful = Signal()
share_repo_to_group_successful = Signal()
change_repo_perm_successful = Signal()
delete_repo_perm_successful = Signal()
