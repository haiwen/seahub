# Copyright (c) 2012-2016 Seafile Ltd.
"""
This file contains error messages from ccnet or seafile that will be translated.
"""
from django.utils.translation import gettext as _

# create_group rpc
msg = _("The group has already created")
msg = _("Failed to create group")

# create_org_group rpc
msg = _("The group has already created in this org.")
msg = _("Failed to create org group.")

# group_add_member rpc
msg = _("Permission error: only group staff can add member")
msg = _("Group does not exist")
msg = _("Group is full")
msg = _("Failed to add member to group")

# group_remove_member rpc
msg = _("Only group staff can remove member")
msg = _("Group does not exist")
msg = _("Can not remove myself")

