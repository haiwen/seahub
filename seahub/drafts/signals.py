# Copyright (c) 2012-2018 Seafile Ltd.
import django.dispatch

comment_review_successful = django.dispatch.Signal(providing_args=["review", "comment", "author"])
