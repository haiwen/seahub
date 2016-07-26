# Copyright (c) 2012-2016 Seafile Ltd.
import django.dispatch

grpmsg_added = django.dispatch.Signal(providing_args=["group_id", "from_email", "message"])
group_join_request = django.dispatch.Signal(providing_args=["staffs", "username", "group", "join_reqeust_msg"])
add_user_to_group = django.dispatch.Signal(providing_args=["group_staff", "group_id", "added_user"])
