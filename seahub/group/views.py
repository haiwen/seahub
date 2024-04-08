# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import logging

from django.conf import settings
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.shortcuts import render

from urllib.parse import quote
from django.utils.translation import gettext as _

from seahub.auth.decorators import login_required
import seaserv
from seaserv import ccnet_threaded_rpc, ccnet_api, get_group

from seahub.auth import REDIRECT_FIELD_NAME
from seahub.base.decorators import sys_staff_required, require_POST
from seahub.group.utils import validate_group_name, BadGroupNameError, \
    ConflictGroupNameError, is_group_member
from seahub.settings import SITE_ROOT
from seahub.utils import send_html_email, is_org_context, \
    get_site_name
from seahub.share.models import ExtraGroupsSharePermission


# Get an instance of a logger
logger = logging.getLogger(__name__)

########## ccnet rpc wrapper
def create_group(group_name, username):
    return seaserv.ccnet_threaded_rpc.create_group(group_name, username)

def create_org_group(org_id, group_name, username):
    return seaserv.ccnet_threaded_rpc.create_org_group(org_id, group_name,
                                                       username)

def get_all_groups(start, limit):
    return seaserv.ccnet_threaded_rpc.get_all_groups(start, limit)

def org_user_exists(org_id, username):
    return seaserv.ccnet_threaded_rpc.org_user_exists(org_id, username)

########## helper functions
def is_group_staff(group, user):
    if user.is_anonymous:
        return False
    return seaserv.check_group_staff(group.id, user.username)

def remove_group_common(group_id, username, org_id=None):
    """Common function to remove a group, and it's repos,
    If ``org_id`` is provided, also remove org group.

    Arguments:
    - `group_id`:
    """
    seaserv.ccnet_threaded_rpc.remove_group(group_id, username)
    seaserv.seafserv_threaded_rpc.remove_repo_group(group_id)
    if org_id and org_id > 0:
        seaserv.ccnet_threaded_rpc.remove_org_group(org_id, group_id)
    # remove record of share to group when group deleted
    ExtraGroupsSharePermission.objects.filter(group_id=group_id).delete()

def group_check(func):
    """
    Decorator for initial group permission check tasks

    un-login user & group not pub --> login page
    un-login user & group pub --> view_perm = "pub"
    login user & non group member & group not pub --> public info page
    login user & non group member & group pub --> view_perm = "pub"
    group member --> view_perm = "joined"
    sys admin --> view_perm = "sys_admin"
    """
    def _decorated(request, group_id, *args, **kwargs):
        group_id_int = int(group_id) # Checked by URL Conf
        group = get_group(group_id_int)
        if not group:
            group_list_url = reverse('groups')
            return HttpResponseRedirect(group_list_url)
        group.is_staff = False
        group.is_pub = False

        if not request.user.is_authenticated:
            if not group.is_pub:
                login_url = settings.LOGIN_URL
                path = quote(request.get_full_path())
                tup = login_url, REDIRECT_FIELD_NAME, path
                return HttpResponseRedirect('%s?%s=%s' % tup)
            else:
                group.view_perm = "pub"
                return func(request, group, *args, **kwargs)

        joined = is_group_member(group_id_int, request.user.username)
        if joined:
            group.view_perm = "joined"
            group.is_staff = is_group_staff(group, request.user)
            return func(request, group, *args, **kwargs)

        if group.is_pub:
            group.view_perm = "pub"
            return func(request, group, *args, **kwargs)

        return render(request, 'error.html', {
                'error_msg': _('Permission denied'),
                })

    return _decorated

########## views
@login_required
@sys_staff_required
@require_POST
def group_remove(request, group_id):
    """
    Remove group from groupadmin page. Only system admin can perform this
    operation.
    """
    # Request header may missing HTTP_REFERER, we need to handle that case.
    next_page = request.headers.get('referer', SITE_ROOT)

    try:
        group_id_int = int(group_id)
    except ValueError:
        return HttpResponseRedirect(next_page)

    remove_group_common(group_id_int, request.user.username)

    return HttpResponseRedirect(next_page)

def rename_group_with_new_name(request, group_id, new_group_name):
    """Rename a group with new name.

    Arguments:
    - `request`:
    - `group_id`:
    - `new_group_name`:

    Raises:
        BadGroupNameError: New group name format is not valid.
        ConflictGroupNameError: New group name confilicts with existing name.
    """
    if not validate_group_name(new_group_name):
        raise BadGroupNameError

    # Check whether group name is duplicated.
    username = request.user.username
    org_id = -1
    if is_org_context(request):
        org_id = request.user.org.org_id
        checked_groups = seaserv.get_org_groups_by_user(org_id, username)
    else:
        if request.cloud_mode:
            checked_groups = ccnet_api.get_groups(username)
        else:
            checked_groups = get_all_groups(-1, -1)

    for g in checked_groups:
        if g.group_name == new_group_name:
            raise ConflictGroupNameError

    ccnet_threaded_rpc.set_group_name(group_id, new_group_name)

def send_group_member_add_mail(request, group, from_user, to_user):
    c = {
        'email': from_user,
        'to_email': to_user,
        'group': group,
        }

    subject = _('You are invited to join a group on %s') % get_site_name()
    send_html_email(subject, 'group/add_member_email.html', c, None, [to_user])
