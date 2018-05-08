# Copyright (c) 2012-2016 Seafile Ltd.
from django.core.urlresolvers import reverse
from django.http import Http404, HttpResponseRedirect, HttpResponseNotAllowed
from django.shortcuts import render

from django.utils.http import urlquote
from seaserv import get_repo, is_passwd_set

from seahub.options.models import UserOptions, CryptoOptionNotSetError

from seahub.base.sudo_mode import sudo_mode_check
from seahub.utils import render_error
from django.utils.translation import ugettext as _
from seahub.settings import ENABLE_SUDO_MODE

def sys_staff_required(func):
    """
    Decorator for views that checks the user is system staff.
    """
    def _decorated(request, *args, **kwargs):
        if not request.user.is_staff:
            raise Http404
        if ENABLE_SUDO_MODE and not sudo_mode_check(request):
            return HttpResponseRedirect(
                reverse('sys_sudo_mode') + '?next=' + urlquote(request.get_full_path()))
        return func(request, *args, **kwargs)
    return _decorated

def user_mods_check(func):
    """Decorator for views that need user's enabled/available modules.
    Populate modules to ``request.user``.
    
    Arguments:
    - `func`:
    """
    def _decorated(request, *args, **kwargs):
        username = request.user.username
        request.user.mods_available = get_available_mods_by_user(username)
        request.user.mods_enabled = get_enabled_mods_by_user(username)
        return func(request, *args, **kwargs)
    _decorated.__name__ = func.__name__
    return _decorated
    
def repo_passwd_set_required(func):
    """
    Decorator for views to redirect user to repo decryption page if repo is
    encrypt and password is not set by user.
    """
    def _decorated(request, *args, **kwargs):
        repo_id = kwargs.get('repo_id', None)
        if not repo_id:
            raise Exception, 'Repo id is not found in url.'
        repo = get_repo(repo_id)
        if not repo:
            raise Http404
        username = request.user.username
        if repo.encrypted:
            try:
                server_crypto = UserOptions.objects.is_server_crypto(username)
            except CryptoOptionNotSetError:
                return render(request, 'options/set_user_options.html', {
                        })

            if (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
                    and not is_passwd_set(repo_id, username):
                return render(request, 'decrypt_repo_form.html', {
                        'repo': repo,
                        'next': request.get_full_path(),
                        })

            if repo.enc_version == 2 and not server_crypto:
                return render_error(request, _(u'Files in this library can not be viewed online.'))

        return func(request, *args, **kwargs)
    return _decorated


def require_POST(func):
    def decorated(request, *args, **kwargs):
        if request.method != 'POST':
            return HttpResponseNotAllowed(['POST'])
        return func(request, *args, **kwargs)
    return decorated

from seahub.views.modules import get_enabled_mods_by_user, \
    get_available_mods_by_user  # Move here to avoid circular import
