# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import os
import json
import logging

from django.core.cache import cache
from django.http import HttpResponse, HttpResponseRedirect, Http404, \
    HttpResponseBadRequest
from django.utils.translation import gettext as _, activate
from django.contrib import messages
from django.utils.html import escape

import seaserv
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.share.forms import FileLinkShareForm, \
    UploadLinkShareForm
from seahub.share.models import FileShare, UploadLinkShare
from seahub.share.signals import share_repo_to_user_successful
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.base.decorators import require_POST
from seahub.contacts.signals import mail_sended
from seahub.views import is_registered_user, check_folder_permission
from seahub.utils import string2list, IS_EMAIL_CONFIGURED, check_filename_with_rename, \
    is_valid_username, is_valid_email, send_html_email, is_org_context, \
    gen_token, normalize_cache_key, get_site_name, gen_shared_link
from seahub.utils.mail import send_html_email_with_dj_template
from seahub.utils.ms_excel import write_xls
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.settings import SITE_ROOT, REPLACE_FROM_EMAIL, \
        ADD_REPLY_TO_HEADER, SHARE_LINK_EMAIL_LANGUAGE, \
        SHARE_LINK_AUDIT_CODE_TIMEOUT
from seahub.profile.models import Profile

# Get an instance of a logger
logger = logging.getLogger(__name__)


# rpc wrapper
def is_org_repo_owner(username, repo_id):
    owner = seaserv.seafserv_threaded_rpc.get_org_repo_owner(repo_id)
    return True if owner == username else False


def org_share_repo(org_id, repo_id, from_user, to_user, permission):
    return seaserv.seafserv_threaded_rpc.org_add_share(org_id, repo_id,
                                                       from_user, to_user,
                                                       permission)


def org_remove_share(org_id, repo_id, from_user, to_user):
    return seaserv.seafserv_threaded_rpc.org_remove_share(org_id, repo_id,
                                                          from_user, to_user)


# functions
def share_to_group(request, repo, group, permission):
    """Share repo to group with given permission.
    """
    repo_id = repo.id
    group_id = group.id
    from_user = request.user.username

    if is_org_context(request):
        org_id = request.user.org.org_id
        group_repo_ids = seafile_api.get_org_group_repoids(org_id, group.id)
    else:
        group_repo_ids = seafile_api.get_group_repoids(group.id)

    if repo.id in group_repo_ids:
        return False

    try:
        if is_org_context(request):
            org_id = request.user.org.org_id
            seafile_api.add_org_group_repo(repo_id, org_id, group_id,
                                           from_user, permission)
        else:
            seafile_api.set_group_repo(repo_id, group_id, from_user,
                                       permission)
        return True
    except Exception as e:
        logger.error(e)
        return False


def share_to_user(request, repo, to_user, permission):
    """Share repo to a user with given permission.
    """
    repo_id = repo.id
    from_user = request.user.username

    if from_user == to_user:
        return False

    # permission check
    org_id = None
    if is_org_context(request):
        org_id = request.user.org.org_id
        if not seaserv.ccnet_threaded_rpc.org_user_exists(org_id, to_user):
            return False
    else:
        if not is_registered_user(to_user):
            return False

    try:
        if is_org_context(request):
            org_id = request.user.org.org_id
            org_share_repo(org_id, repo_id, from_user, to_user, permission)
        else:
            seafile_api.share_repo(repo_id, from_user, to_user, permission)
    except SearpcError as e:
        logger.error(e)
        return False
    else:
        # send a signal when sharing repo successful
        share_repo_to_user_successful.send(sender=None,
                                           from_user=from_user,
                                           to_user=to_user, repo=repo,
                                           path='/', org_id=org_id)
        return True


# share link
@login_required_ajax
def send_shared_link(request):
    """
    Handle ajax post request to send file shared link.
    """
    if not request.method == 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    if not IS_EMAIL_CONFIGURED:
        data = json.dumps({'error': _('Failed to send email, email service is not properly configured, please contact administrator.')})
        return HttpResponse(data, status=500, content_type=content_type)

    form = FileLinkShareForm(request.POST)
    if form.is_valid():
        email = form.cleaned_data['email']
        file_shared_link = form.cleaned_data['file_shared_link']
        file_shared_name = form.cleaned_data['file_shared_name']
        file_shared_type = form.cleaned_data['file_shared_type']
        extra_msg = escape(form.cleaned_data['extra_msg'])

        to_email_list = string2list(email)
        send_success, send_failed = [], []
        # use contact_email, if present
        username = Profile.objects.get_contact_email_by_user(request.user.username)
        for to_email in to_email_list:
            if not is_valid_email(to_email):
                send_failed.append(to_email)
                continue

            if SHARE_LINK_EMAIL_LANGUAGE:
                activate(SHARE_LINK_EMAIL_LANGUAGE)

            # Add email to contacts.
            mail_sended.send(sender=None, user=request.user.username,
                             email=to_email)

            c = {
                'email': request.user.username,
                'to_email': to_email,
                'file_shared_link': file_shared_link,
                'file_shared_name': file_shared_name,
            }

            if extra_msg:
                c['extra_msg'] = extra_msg

            if REPLACE_FROM_EMAIL:
                from_email = username
            else:
                from_email = None  # use default from email

            if ADD_REPLY_TO_HEADER:
                reply_to = username
            else:
                reply_to = None

            try:
                if file_shared_type == 'f':
                    c['file_shared_type'] = _("file")
                    send_html_email(_('A file is shared to you on %s') % get_site_name(),
                                    'shared_link_email.html',
                                    c, from_email, [to_email],
                                    reply_to=reply_to
                                    )
                else:
                    c['file_shared_type'] = _("directory")
                    send_html_email(_('A directory is shared to you on %s') % get_site_name(),
                                    'shared_link_email.html',
                                    c, from_email, [to_email],
                                    reply_to=reply_to)

                send_success.append(to_email)
            except Exception:
                send_failed.append(to_email)

        if len(send_success) > 0:
            data = json.dumps({"send_success": send_success, "send_failed": send_failed})
            return HttpResponse(data, status=200, content_type=content_type)
        else:
            data = json.dumps({"error": _("Internal server error, or please check the email(s) you entered")})
            return HttpResponse(data, status=400, content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)


@login_required
def save_shared_link(request):
    """Save public share link to one's library.
    """
    username = request.user.username
    token = request.GET.get('t', '')
    dst_repo_id = request.POST.get('dst_repo', '')
    dst_path = request.POST.get('dst_path', '')

    next_page = request.headers.get('referer', None)
    if not next_page:
        next_page = SITE_ROOT

    if not dst_repo_id or not dst_path:
        messages.error(request, _('Please choose a directory.'))
        return HttpResponseRedirect(next_page)

    if check_folder_permission(request, dst_repo_id, dst_path) != 'rw':
        messages.error(request, _('Permission denied'))
        return HttpResponseRedirect(next_page)

    try:
        fs = FileShare.objects.get(token=token)
    except FileShare.DoesNotExist:
        raise Http404

    src_repo_id = fs.repo_id
    src_path = os.path.dirname(fs.path)
    obj_name = os.path.basename(fs.path)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    seafile_api.copy_file(src_repo_id, src_path,
                          json.dumps([obj_name]),
                          dst_repo_id, dst_path,
                          json.dumps([new_obj_name]),
                          username, need_progress=0)

    messages.success(request, _('Successfully saved.'))
    return HttpResponseRedirect(next_page)


# share link
@login_required
def export_shared_link(request):
    """
    Export shared links to excel.
    """

    def get_share_link_info(fileshare):

        if fileshare.expire_date:
            expire_date = datetime_to_isoformat_timestr(fileshare.expire_date)
        else:
            expire_date = ''

        info = {}
        info['username'] = fileshare.username
        info['link'] = gen_shared_link(fileshare.token, fileshare.s_type)
        info['expire_date'] = expire_date
        info['password'] = fileshare.get_password()

        can_edit = fileshare.get_permissions().get('can_edit')
        can_download = fileshare.get_permissions().get('can_download')
        can_upload = fileshare.get_permissions().get('can_upload')
        permission_str = f"{can_edit} {can_download} {can_upload}".lower()

        permission_dict = {
            "false true false": _('Preview and download'),
            "false false false": _('Preview only'),
            "false true true": _('Download and upload'),
            "true true false": _('Edit on cloud and download'),
            "true false false": _('Edit on cloud only')
        }

        info['permission'] = permission_dict.get(permission_str, '')

        return info

    token_list = request.GET.getlist('token')
    if not token_list:
        data = json.dumps({'error': _('Argument missing')})
        return HttpResponse(data,
                            status=400,
                            content_type='application/json; charset=utf-8')

    data_list = []
    username = request.user.username
    share_links = FileShare.objects.filter(token__in=token_list)

    for link in share_links:

        if link.username != username:
            continue

        link_info = get_share_link_info(link)
        row = [link_info.get('link'), link_info.get('username'),
               link_info.get('password') or '--',
               link_info.get('permission'),
               link_info.get('expire_date')]

        data_list.append(row)

    excel_name = 'Share Links'
    head = [_("Share Link"), _("Creator"),
            _('Password'), _("Permission"), _("Expiration")]

    try:
        wb = write_xls(excel_name, head, data_list)
    except Exception as e:
        logger.error(e)
        data = json.dumps({'error': _('Internal Server Error')})
        return HttpResponse(data,
                            status=500,
                            content_type='application/json; charset=utf-8')

    response = HttpResponse(content_type='application/ms-excel')
    response['Content-Disposition'] = 'attachment; filename="%s.xlsx"' % excel_name
    wb.save(response)

    return response


@login_required_ajax
def send_shared_upload_link(request):
    """
    Handle ajax post request to send shared upload link.
    """
    if not request.method == 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    if not IS_EMAIL_CONFIGURED:
        data = json.dumps({'error': _('Failed to send email, email service is not properly configured, please contact administrator.')})
        return HttpResponse(data, status=500, content_type=content_type)

    form = UploadLinkShareForm(request.POST)
    if form.is_valid():
        email = form.cleaned_data['email']
        shared_upload_link = form.cleaned_data['shared_upload_link']
        extra_msg = escape(form.cleaned_data['extra_msg'])

        to_email_list = string2list(email)
        send_success, send_failed = [], []
        # use contact_email, if present
        username = Profile.objects.get_contact_email_by_user(request.user.username)
        for to_email in to_email_list:
            if not is_valid_email(to_email):
                send_failed.append(to_email)
                continue
            # Add email to contacts.
            mail_sended.send(sender=None, user=request.user.username,
                             email=to_email)

            c = {
                'email': request.user.username,
                'to_email': to_email,
                'shared_upload_link': shared_upload_link,
                }

            if extra_msg:
                c['extra_msg'] = extra_msg

            if REPLACE_FROM_EMAIL:
                from_email = username
            else:
                from_email = None  # use default from email

            if ADD_REPLY_TO_HEADER:
                reply_to = username
            else:
                reply_to = None

            try:
                send_html_email(_('An upload link is shared to you on %s') % get_site_name(),
                                'shared_upload_link_email.html',
                                c, from_email, [to_email],
                                reply_to=reply_to)

                send_success.append(to_email)
            except Exception:
                send_failed.append(to_email)

        if len(send_success) > 0:
            data = json.dumps({"send_success": send_success, "send_failed": send_failed})
            return HttpResponse(data, status=200, content_type=content_type)
        else:
            data = json.dumps({"error": _("Internal server error, or please check the email(s) you entered")})
            return HttpResponse(data, status=400, content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)


@login_required_ajax
@require_POST
def ajax_private_share_dir(request):
    content_type = 'application/json; charset=utf-8'

    repo_id = request.POST.get('repo_id', '')
    path = request.POST.get('path', '')
    username = request.user.username
    result = {}

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        result['error'] = _('Library does not exist.')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    if seafile_api.get_dir_id_by_path(repo_id, path) is None:
        result['error'] = _('Directory does not exist.')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    if path != '/':
        # if share a dir, check sub-repo first
        try:
            if is_org_context(request):
                org_id = request.user.org.org_id
                sub_repo = seaserv.seafserv_threaded_rpc.get_org_virtual_repo(
                    org_id, repo_id, path, username)
            else:
                sub_repo = seafile_api.get_virtual_repo(repo_id, path, username)
        except SearpcError as e:
            result['error'] = e.msg
            return HttpResponse(json.dumps(result), status=500, content_type=content_type)

        if not sub_repo:
            name = os.path.basename(path)
            # create a sub-lib
            try:
                # use name as 'repo_name' & 'repo_desc' for sub_repo
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    sub_repo_id = seaserv.seafserv_threaded_rpc.create_org_virtual_repo(
                        org_id, repo_id, path, name, name, username)
                else:
                    sub_repo_id = seafile_api.create_virtual_repo(repo_id, path, name, name, username)
                sub_repo = seafile_api.get_repo(sub_repo_id)
            except SearpcError as e:
                result['error'] = e.msg
                return HttpResponse(json.dumps(result), status=500, content_type=content_type)

        shared_repo_id = sub_repo.id
        shared_repo = sub_repo
    else:
        shared_repo_id = repo_id
        shared_repo = repo

    emails_string = request.POST.get('emails', '')
    groups_string = request.POST.get('groups', '')
    perm = request.POST.get('perm', '')

    emails = string2list(emails_string)
    groups = string2list(groups_string)

    # Test whether user is the repo owner.
    if not seafile_api.is_repo_owner(username, shared_repo_id) and \
            not is_org_repo_owner(username, shared_repo_id):
        result['error'] = _('Only the owner of the library has permission to share it.')
        return HttpResponse(json.dumps(result), status=500, content_type=content_type)

    # Parsing input values.
    # no 'share_to_all'
    share_to_groups, share_to_users, shared_success, shared_failed = [], [], [], []

    for email in emails:
        email = email.lower()
        if is_valid_username(email):
            share_to_users.append(email)
        else:
            shared_failed.append(email)

    for group_id in groups:
        share_to_groups.append(seaserv.get_group(group_id))

    for email in share_to_users:
        # Add email to contacts.
        mail_sended.send(sender=None, user=request.user.username, email=email)
        if share_to_user(request, shared_repo, email, perm):
            shared_success.append(email)
        else:
            shared_failed.append(email)

    for group in share_to_groups:
        if share_to_group(request, shared_repo, group, perm):
            shared_success.append(group.group_name)
        else:
            shared_failed.append(group.group_name)

    if len(shared_success) > 0:
        return HttpResponse(json.dumps({
            "shared_success": shared_success,
            "shared_failed": shared_failed
            }), content_type=content_type)
    else:
        # for case: only share to users and the emails are not valid
        data = json.dumps({"error": _("Please check the email(s) you entered")})
        return HttpResponse(data, status=400, content_type=content_type)


def ajax_get_link_audit_code(request):
    """
    Generate a token, and record that token with email in cache, expires in
    one hour, send token to that email address.

    User provide token and email at share link page, if the token and email
    are valid, record that email in session.
    """
    content_type = 'application/json; charset=utf-8'

    token = request.POST.get('token')
    email = request.POST.get('email')
    if not is_valid_email(email):
        return HttpResponse(json.dumps({
            'error': _('Email address is not valid')
        }), status=400, content_type=content_type)

    dfs = FileShare.objects.get_valid_file_link_by_token(token)
    ufs = UploadLinkShare.objects.get_valid_upload_link_by_token(token)

    fs = dfs if dfs else ufs
    if fs is None:
        return HttpResponse(json.dumps({
            'error': _('Share link is not found')
        }), status=400, content_type=content_type)

    cache_key = normalize_cache_key(email, 'share_link_audit_')
    code = gen_token(max_length=6)
    cache.set(cache_key, code, SHARE_LINK_AUDIT_CODE_TIMEOUT)

    # send code to user via email
    subject = _("Verification code for visiting share links")
    c = {'code': code}

    send_success = send_html_email_with_dj_template(email,
                                                    subject=subject,
                                                    dj_template='share/audit_code_email.html',
                                                    context=c)

    if not send_success:
        logger.error('Failed to send audit code via email to %s')
        return HttpResponse(json.dumps({
            "error": _("Failed to send a verification code, please try again later.")
        }), status=500, content_type=content_type)

    return HttpResponse(json.dumps({'success': True}), status=200,
                        content_type=content_type)
