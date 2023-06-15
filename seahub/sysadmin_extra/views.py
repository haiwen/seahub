# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging

from django.shortcuts import render

from django.utils.translation import gettext as _
from django.contrib import messages
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.core.exceptions import ValidationError

from seahub.api2.endpoints.utils import check_time_period_valid, \
    get_log_events_by_type_and_time

from seahub.base.decorators import sys_staff_required
from seahub.auth.decorators import login_required
from seahub.sysadmin_extra.models import UserLoginLog
from seahub.utils import EVENTS_ENABLED, get_file_audit_events, \
    get_file_update_events, get_perm_audit_events, \
    is_pro_version, generate_file_audit_event_type
from seahub.utils.timeutils import utc_to_local
from seahub.utils.ms_excel import write_xls
from seahub.settings import SITE_ROOT

from seaserv import seafile_api, ccnet_api

logger = logging.getLogger(__name__)

@login_required
@sys_staff_required
def sys_login_admin_export_excel(request):
    """ Export user login logs to excel.
    """
    next_page = request.headers.get('referer', None)
    if not next_page:
        next_page = SITE_ROOT

    start = request.GET.get('start', None)
    end = request.GET.get('end', None)

    if not check_time_period_valid(start, end):
        messages.error(request, _('Failed to export excel, invalid start or end date'))
        return HttpResponseRedirect(next_page)

    # Filtering a DateTimeField with dates won't include items on the last day,
    # because the bounds are interpreted as '0am on the given date'.
    end = end + ' 23:59:59'

    try:
        user_login_logs = UserLoginLog.objects.filter(login_date__range=(start, end))
    except ValidationError as e:
        logger.error(e)
        messages.error(request, _('Failed to export excel, invalid start or end date'))
        return HttpResponseRedirect(next_page)

    logs = list(user_login_logs)
    head = [_("Name"), _("IP"), _("Status"), _("Time")]
    data_list = []
    for log in logs:
        login_time = log.login_date.strftime("%Y-%m-%d %H:%M:%S")
        status = _('Success') if log.login_success else _('Failed')
        row = [log.username, log.login_ip, status, login_time]
        data_list.append(row)

    wb = write_xls('login-logs', head, data_list)
    if not wb:
        messages.error(request, _('Failed to export excel'))
        return HttpResponseRedirect(next_page)

    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = 'attachment; filename=login-logs.xlsx'
    wb.save(response)
    return response

@login_required
@sys_staff_required
def sys_log_file_audit_export_excel(request):
    """ Export file access logs to excel.
    """
    next_page = request.headers.get('referer', None)
    if not next_page:
        next_page = SITE_ROOT

    if not is_pro_version():
        messages.error(request, _('Failed to export excel, this feature is only in professional version.'))
        return HttpResponseRedirect(next_page)

    start = request.GET.get('start', None)
    end = request.GET.get('end', None)
    if not check_time_period_valid(start, end):
        messages.error(request, _('Failed to export excel, invalid start or end date'))
        return HttpResponseRedirect(next_page)

    events = get_log_events_by_type_and_time('file_audit', start, end)

    head = [_("User"), _("Type"), _("IP"), _("Device"), _("Date"),
            _("Library Name"), _("Library ID"), _("Library Owner"), _("File Path")]
    data_list = []

    events.sort(key=lambda x: x.timestamp, reverse=True)
    for ev in events:
        event_type, ev.show_device = generate_file_audit_event_type(ev)

        repo_id = ev.repo_id
        repo = seafile_api.get_repo(repo_id)
        if repo:
            repo_name = repo.name
            repo_owner = seafile_api.get_repo_owner(repo_id) or \
                    seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_name = _('Deleted')
            repo_owner = '--'

        username = ev.user if ev.user else _('Anonymous User')
        date = utc_to_local(ev.timestamp).strftime('%Y-%m-%d %H:%M:%S') if \
            ev.timestamp else ''

        row = [username, event_type, ev.ip, ev.show_device,
               date, repo_name, ev.repo_id, repo_owner, ev.file_path]
        data_list.append(row)

    wb = write_xls('file-access-logs', head, data_list)
    if not wb:
        messages.error(request, _('Failed to export excel'))
        return HttpResponseRedirect(next_page)

    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = 'attachment; filename=file-access-logs.xlsx'
    wb.save(response)
    return response

@login_required
@sys_staff_required
def sys_log_file_update_export_excel(request):
    """ Export file update logs to excel.
    """
    next_page = request.headers.get('referer', None)
    if not next_page:
        next_page = SITE_ROOT

    if not is_pro_version():
        messages.error(request, _('Failed to export excel, this feature is only in professional version.'))
        return HttpResponseRedirect(next_page)

    start = request.GET.get('start', None)
    end = request.GET.get('end', None)
    if not check_time_period_valid(start, end):
        messages.error(request, _('Failed to export excel, invalid start or end date'))
        return HttpResponseRedirect(next_page)

    events = get_log_events_by_type_and_time('file_update', start, end)

    head = [_("User"), _("Date"), _("Library Name"), _("Library ID"),
            _("Library Owner"), _("Action")]
    data_list = []

    events.sort(key=lambda x: x.timestamp, reverse=True)
    for ev in events:

        repo_id = ev.repo_id
        repo = seafile_api.get_repo(repo_id)
        if repo:
            repo_name = repo.name
            repo_owner = seafile_api.get_repo_owner(repo_id) or \
                    seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_name = _('Deleted')
            repo_owner = '--'

        username = ev.user if ev.user else _('Anonymous User')
        date = utc_to_local(ev.timestamp).strftime('%Y-%m-%d %H:%M:%S') if \
            ev.timestamp else ''

        row = [username, date, repo_name, ev.repo_id, repo_owner, ev.file_oper.strip()]
        data_list.append(row)

    wb = write_xls('file-update-logs', head, data_list)
    if not wb:
        messages.error(request, _('Failed to export excel'))
        return HttpResponseRedirect(next_page)

    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = 'attachment; filename=file-update-logs.xlsx'
    wb.save(response)
    return response

@login_required
@sys_staff_required
def sys_log_perm_audit_export_excel(request):
    """ Export permission audit logs to excel.
    """
    next_page = request.headers.get('referer', None)
    if not next_page:
        next_page = SITE_ROOT

    if not is_pro_version():
        messages.error(request, _('Failed to export excel, this feature is only in professional version.'))
        return HttpResponseRedirect(next_page)

    start = request.GET.get('start', None)
    end = request.GET.get('end', None)
    if not check_time_period_valid(start, end):
        messages.error(request, _('Failed to export excel, invalid start or end date'))
        return HttpResponseRedirect(next_page)

    events = get_log_events_by_type_and_time('perm_audit', start, end)

    head = [_("From"), _("To"), _("Action"), _("Permission"), _("Library"),
            _("Folder Path"), _("Date")]
    data_list = []

    events.sort(key=lambda x: x.timestamp, reverse=True)
    for ev in events:
        repo = seafile_api.get_repo(ev.repo_id)
        repo_name = repo.repo_name if repo else _('Deleted')

        if '@' in ev.to:
            to = ev.to
        elif ev.to.isdigit():
            group = ccnet_api.get_group(int(ev.to))
            to = group.group_name if group else _('Deleted')
        elif 'all' in ev.to:
            to = _('Organization')
        else:
            to = '--'

        if 'add' in ev.etype:
            action = _('Add')
        elif 'modify' in ev.etype:
            action = _('Modify')
        elif 'delete' in ev.etype:
            action = _('Delete')
        else:
            action = '--'

        if ev.permission == 'rw':
            permission = _('Read-Write')
        elif ev.permission == 'r':
            permission = _('Read-Only')
        else:
            permission = '--'

        date = utc_to_local(ev.timestamp).strftime('%Y-%m-%d %H:%M:%S') if \
            ev.timestamp else ''

        row = [ev.from_user, to, action, permission, repo_name,
               ev.file_path, date]
        data_list.append(row)

    wb = write_xls('perm-audit-logs', head, data_list)
    if not wb:
        next_page = request.headers.get('referer', None)
        if not next_page:
            next_page = SITE_ROOT

        messages.error(request, _('Failed to export excel'))
        return HttpResponseRedirect(next_page)

    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = 'attachment; filename=perm-audit-logs.xlsx'
    wb.save(response)
    return response
