# Copyright (c) 2012-2016 Seafile Ltd.
import json
import logging

from django.urls import reverse
from django.contrib import messages
from django.http import HttpResponseRedirect, HttpResponse
from django.shortcuts import render

from django.utils.translation import gettext as _
import seaserv
from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.auth.decorators import login_required_ajax
from seahub.base.accounts import User
from seahub.base.decorators import require_POST
from seahub.base.models import UserLastLogin
from seahub.institutions.decorators import (inst_admin_required,
                                            inst_admin_can_manage_user)
from seahub.institutions.utils import get_institution_available_quota
from seahub.profile.models import Profile, DetailedProfile
from seahub.utils import is_valid_username
from seahub.utils.rpc import mute_seafile_api
from seahub.utils.file_size import get_file_size_unit
from seahub.views.sysadmin import email_user_on_activation
from seahub.institutions.models import InstitutionAdmin

logger = logging.getLogger(__name__)


def _populate_user_quota_usage(user):
    """Populate space/share quota to user.

    Arguments:
    - `user`:
    """
    try:
        user.space_usage = seafile_api.get_user_self_usage(user.email)
        user.space_quota = seafile_api.get_user_quota(user.email)
    except SearpcError as e:
        logger.error(e)
        user.space_usage = -1
        user.space_quota = -1


@inst_admin_required
def info(request):
    """List instituion info.
    """
    inst = request.user.institution

    return render(request, 'institutions/info.html', {
        'inst': inst,
    })


@inst_admin_required
def useradmin(request):
    """List users in the institution.
    """
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '100'))
    except ValueError:
        current_page = 1
        per_page = 100

    offset = per_page * (current_page - 1)
    inst = request.user.institution
    usernames = [x.user for x in Profile.objects.filter(institution=inst.name)[offset:offset + per_page + 1]]
    if len(usernames) == per_page + 1:
        page_next = True
    else:
        page_next = False

    users = [User.objects.get(x) for x in usernames[:per_page]]
    admin_emails = [user.user for user in InstitutionAdmin.objects.filter(institution=inst)]
    last_logins = UserLastLogin.objects.filter(username__in=[x.username for x in users])

    for u in users:

        u.is_institution_admin = u.email in admin_emails

        if u.username == request.user.username:
            u.is_self = True

        _populate_user_quota_usage(u)

        for e in last_logins:
            if e.username == u.username:
                u.last_login = e.last_login

    return render(request, 'institutions/useradmin.html', {
        'inst': inst,
        'users': users,
        'current_page': current_page,
        'prev_page': current_page - 1,
        'next_page': current_page + 1,
        'per_page': per_page,
        'page_next': page_next,
    })


@inst_admin_required
def useradmin_search(request):
    """Search users in the institution.
    """
    inst = request.user.institution

    q = request.GET.get('q', '').lower()
    if not q:
        return HttpResponseRedirect(reverse('institutions:useradmin'))

    profiles = Profile.objects.filter(institution=inst.name)
    usernames = [x.user for x in profiles if q in x.user]
    users = [User.objects.get(x) for x in usernames]
    admin_emails = [user.user for user in InstitutionAdmin.objects.filter(institution=inst)]
    last_logins = UserLastLogin.objects.filter(username__in=[x.username for x in users])

    for u in users:

        u.is_institution_admin = u.email in admin_emails

        if u.username == request.user.username:
            u.is_self = True

        _populate_user_quota_usage(u)

        for e in last_logins:
            if e.username == u.username:
                u.last_login = e.last_login

    return render(request, 'institutions/useradmin_search.html', {
        'inst': inst,
        'users': users,
        'q': q,
    })


@inst_admin_required
@inst_admin_can_manage_user
def user_info(request, email):
    """Show user info, libraries and groups.
    """

    owned_repos = mute_seafile_api.get_owned_repo_list(email,
                                                       ret_corrupted=True)
    owned_repos = [r for r in owned_repos if not r.is_virtual]

    in_repos = mute_seafile_api.get_share_in_repo_list(email, -1, -1)
    space_usage = mute_seafile_api.get_user_self_usage(email)
    space_quota = mute_seafile_api.get_user_quota(email)

    # get user profile
    profile = Profile.objects.get_profile_by_user(email)
    d_profile = DetailedProfile.objects.get_detailed_profile_by_user(email)

    try:
        personal_groups = ccnet_api.get_groups(email)
    except SearpcError as e:
        logger.error(e)
        personal_groups = []

    for g in personal_groups:
        try:
            is_group_staff = seaserv.check_group_staff(g.id, email)
        except SearpcError as e:
            logger.error(e)
            is_group_staff = False

        if email == g.creator_name:
            g.role = _('Owner')
        elif is_group_staff:
            g.role = _('Admin')
        else:
            g.role = _('Member')

    available_quota = get_institution_available_quota(request.user.institution)

    return render(request,
                  'institutions/user_info.html',
                  {
                      'owned_repos': owned_repos,
                      'space_quota': space_quota,
                      'space_usage': space_usage,
                      'in_repos': in_repos,
                      'email': email,
                      'profile': profile,
                      'd_profile': d_profile,
                      'personal_groups': personal_groups,
                      'available_quota': available_quota,
                  })


@require_POST
@inst_admin_required
@inst_admin_can_manage_user
def user_remove(request, email):
    """Remove a institution user.
    """
    referer = request.headers.get('referer', None)
    next_page = reverse('institutions:useradmin') if referer is None else referer

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        messages.error(request, _('Failed to delete: the user does not exist'))
        return HttpResponseRedirect(next_page)

    if user.is_staff:
        messages.error(request, _('Failed to delete: the user is system administrator'))
        return HttpResponseRedirect(next_page)

    user.delete()
    messages.success(request, _('Successfully deleted %s') % user.username)
    return HttpResponseRedirect(next_page)


@login_required_ajax
@require_POST
@inst_admin_required
@inst_admin_can_manage_user
def user_set_quota(request, email):
    content_type = 'application/json; charset=utf-8'
    quota_mb = int(request.POST.get('space_quota', 0))
    quota = quota_mb * get_file_size_unit('MB')

    available_quota = get_institution_available_quota(request.user.institution)
    if available_quota < quota:
        result = {}
        result['error'] = _('Failed to set quota: maximum quota is %d MB' % (available_quota / 10 ** 6))
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    seafile_api.set_user_quota(email, quota)

    return HttpResponse(json.dumps({'success': True}), content_type=content_type)


@login_required_ajax
@require_POST
@inst_admin_required
@inst_admin_can_manage_user
def user_toggle_status(request, email):
    content_type = 'application/json; charset=utf-8'

    if not is_valid_username(email):
        return HttpResponse(json.dumps({'success': False}), status=400,
                            content_type=content_type)

    try:
        user_status = int(request.POST.get('s', 0))
    except ValueError:
        user_status = 0

    try:
        user = User.objects.get(email)
        user.is_active = bool(user_status)
        result_code = user.save()
        if result_code == -1:
            return HttpResponse(json.dumps({'success': False}), status=403,
                                content_type=content_type)

        if user.is_active is True:
            try:
                email_user_on_activation(user)
                email_sent = True
            except Exception as e:
                logger.error(e)
                email_sent = False

            return HttpResponse(json.dumps({'success': True,
                                            'email_sent': email_sent,
                                            }), content_type=content_type)

        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)
    except User.DoesNotExist:
        return HttpResponse(json.dumps({'success': False}), status=500,
                            content_type=content_type)
