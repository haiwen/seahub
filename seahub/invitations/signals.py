# Copyright (c) 2012-2016 Seafile Ltd.
import django.dispatch

accept_guest_invitation_successful = django.dispatch.Signal(
    providing_args=["invitation_obj"])
