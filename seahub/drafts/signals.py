# Copyright (c) 2012-2018 Seafile Ltd.
import django.dispatch

comment_review_successful = django.dispatch.Signal(providing_args=["review", "comment", "author"])
request_reviewer_successful = django.dispatch.Signal(providing_args=["from_user", "to_user", "review_id"])
update_review_successful = django.dispatch.Signal(providing_args=["from_user", "to_user", "review_id", "status"])
