# Copyright (c) 2012-2016 Seafile Ltd.
import json
from django.core.cache import cache
from django.conf import settings
from django.shortcuts import render
from django.utils.translation import gettext as _

from rest_framework import status

from seahub.api2.utils import api_error
from seahub.share.models import FileShare, UploadLinkShare
from seahub.share.utils import SCOPE_SPECIFIC_EMAILS, SCOPE_ALL_USERS, SCOPE_SPECIFIC_USERS
from seahub.utils import render_error
from seahub.utils import normalize_cache_key, is_pro_version, redirect_to_login
from seahub.constants import REPO_SHARE_LINK_COUNT_LIMIT


def _share_link_auth_email_entry(request, fileshare, func, *args, **kwargs):
    if request.user.username == fileshare.username:
        return func(request, fileshare, *args, **kwargs)
    
    session_key = "link_authed_email_%s" % fileshare.token
    if request.session.get(session_key) is not None:
        request.user.username = request.session.get(session_key)
        return func(request, fileshare, *args, **kwargs)
    
    if request.method == 'GET':
        email = request.GET.get('email', '')
        return render(request, 'share/share_link_email_audit.html', {'email': email, 'token': fileshare.token})
    
    elif request.method == 'POST':
        code_post = request.POST.get('code', '')
        email_post = request.POST.get('email', '')
        cache_key = normalize_cache_key(email_post, 'share_link_email_auth_', token=fileshare.token)
        code = cache.get(cache_key)
        
        authed_details = json.loads(fileshare.authed_details)
        if code == code_post and email_post in authed_details.get('authed_emails'):
            request.session[session_key] = email_post
            request.user.username = request.session.get(session_key)
            cache.delete(cache_key)
            return func(request, fileshare, *args, **kwargs)
        else:
            return render(request, 'share/share_link_email_audit.html', {
                'err_msg': 'Invalid token, please try again.',
                'email': email_post,
                'code': code,
                'token': fileshare.token,
                'code_verify': False
                
            })
    else:
        assert False, 'TODO'


def share_link_audit(func):

    def _decorated(request, token, *args, **kwargs):

        assert token is not None    # Checked by URLconf
        
        is_for_upload = False
        try:
            fileshare = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            fileshare = None

        if not fileshare:
            try:
                fileshare = UploadLinkShare.objects.get(token=token)
                is_for_upload = True
            except UploadLinkShare.DoesNotExist:
                fileshare = None
                
        if not fileshare:
            return render_error(request, _('Link does not exist.'))
            
        if fileshare.is_expired():
            return render_error(request, _('Link is expired.'))
        
        if is_for_upload:
            return func(request, fileshare, *args, **kwargs)
        
        if fileshare.user_scope in [SCOPE_ALL_USERS, SCOPE_SPECIFIC_USERS]:
            return func(request, fileshare, *args, **kwargs)

        if fileshare.user_scope == SCOPE_SPECIFIC_EMAILS:
            return _share_link_auth_email_entry(request, fileshare, func, *args, **kwargs)
        
    return _decorated

def share_link_login_required(func):

    def _decorated(request, *args, **kwargs):

        if not request.user.is_authenticated \
                and settings.SHARE_LINK_LOGIN_REQUIRED:
            return redirect_to_login(request)
        else:
            return func(request, *args, **kwargs)

    return _decorated


def check_share_link_count(func):

    def _decorated(view, request, *args, **kwargs):

        repo_id = request.data.get('repo_id', None)
        share_link_num = request.data.get('number', 1)

        try:
            share_link_num = int(share_link_num)
        except ValueError:
            error_msg = 'number invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        link_count = FileShare.objects.get_share_link_count_by_repo(repo_id)
        if link_count + share_link_num > REPO_SHARE_LINK_COUNT_LIMIT:
            error_msg = _("The number of share link exceeds the limit.")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return func(view, request, *args, **kwargs)

    return _decorated
