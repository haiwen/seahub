# Copyright (c) 2012-2018 Seafile Ltd.
import django.dispatch

comment_draft_successful = django.dispatch.Signal()
request_reviewer_successful = django.dispatch.Signal()
update_review_successful = django.dispatch.Signal()
