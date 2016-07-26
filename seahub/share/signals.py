# Copyright (c) 2012-2016 Seafile Ltd.
import django.dispatch

share_repo_to_user_successful = django.dispatch.Signal(providing_args=["from_user", "to_user", "repo"])
share_repo_to_group_successful = django.dispatch.Signal(providing_args=["from_user", "group_id", "repo"])
