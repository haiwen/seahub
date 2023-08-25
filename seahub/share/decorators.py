# Copyright (c) 2012-2016 Seafile Ltd.
from django.core.cache import cache
from django.conf import settings
from django.shortcuts import render
from django.utils.translation import ugettext as _

from rest_framework import status

from seahub.api2.utils import api_error
from seahub.share.models import FileShare, UploadLinkShare
from seahub.utils import render_error
from seahub.utils import normalize_cache_key, is_pro_version, redirect_to_login
from seahub.constants import REPO_SHARE_LINK_COUNT_LIMIT


def share_link_audit(func):

    def _decorated(request, token, *args, **kwargs):

        assert token is not None    # Checked by URLconf

        try:
            fileshare = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            fileshare = None

        if not fileshare:
            try:
                fileshare = UploadLinkShare.objects.get(token=token)
            except UploadLinkShare.DoesNotExist:
                fileshare = None

        if not fileshare:
            return render_error(request, _('Link does not exist.'))

        if fileshare.is_expired():
            return render_error(request, _('Link is expired.'))

        if not is_pro_version() or not settings.ENABLE_SHARE_LINK_AUDIT:
            return func(request, fileshare, *args, **kwargs)

        # no audit for authenticated user, since we've already got email address
        if request.user.is_authenticated:
            return func(request, fileshare, *args, **kwargs)

        # anonymous user
        if request.session.get('anonymous_email') is not None:
            request.user.username = request.session.get('anonymous_email')
            return func(request, fileshare, *args, **kwargs)

        if request.method == 'GET':
            return render(request, 'share/share_link_audit.html', {
                'token': token,
            })
        elif request.method == 'POST':

            code = request.POST.get('code', '')
            email = request.POST.get('email', '')

            cache_key = normalize_cache_key(email, 'share_link_audit_')
            if code == cache.get(cache_key):
                # code is correct, add this email to session so that he will
                # not be asked again during this session, and clear this code.
                request.session['anonymous_email'] = email
                request.user.username = request.session.get('anonymous_email')
                cache.delete(cache_key)
                return func(request, fileshare, *args, **kwargs)
            else:
                return render(request, 'share/share_link_audit.html', {
                    'err_msg': 'Invalid token, please try again.',
                    'email': email,
                    'code': code,
                    'token': token,
                })
        else:
            assert False, 'TODO'

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
