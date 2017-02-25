# Copyright (c) 2012-2016 Seafile Ltd.
from django.core.cache import cache
from django.conf import settings
from django.http import Http404
from django.shortcuts import render_to_response
from django.template import RequestContext

from seahub.share.models import FileShare, UploadLinkShare
from seahub.utils import normalize_cache_key, is_pro_version

def share_link_audit(func):
    def _decorated(request, token, *args, **kwargs):
        assert token is not None    # Checked by URLconf

        fileshare = FileShare.objects.get_valid_file_link_by_token(token) or \
                    FileShare.objects.get_valid_dir_link_by_token(token) or \
                    UploadLinkShare.objects.get_valid_upload_link_by_token(token)
        if fileshare is None:
            raise Http404

        if not is_pro_version() or not settings.ENABLE_SHARE_LINK_AUDIT:
            return func(request, fileshare, *args, **kwargs)

        # no audit for authenticated user, since we've already got email address
        if request.user.is_authenticated():
            return func(request, fileshare, *args, **kwargs)

        # anonymous user
        if request.session.get('anonymous_email') is not None:
            request.user.username = request.session.get('anonymous_email')
            return func(request, fileshare, *args, **kwargs)

        if request.method == 'GET':
            return render_to_response('share/share_link_audit.html', {
                'token': token,
            }, context_instance=RequestContext(request))
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
                return render_to_response('share/share_link_audit.html', {
                    'err_msg': 'Invalid token, please try again.',
                    'email': email,
                    'code': code,
                    'token': token,
                }, context_instance=RequestContext(request))
        else:
            assert False, 'TODO'

    return _decorated
