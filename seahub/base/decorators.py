from django.http import Http404
from django.shortcuts import render_to_response
from django.template import RequestContext
from seaserv import get_repo, is_passwd_set

from seahub.options.models import UserOptions, CryptoOptionNotSetError

from seahub.utils import render_error
from django.utils.translation import ugettext as _
from seahub.views.modules import get_enabled_mods_by_user, \
    get_available_mods_by_user
from seahub.settings import FORCE_SERVER_CRYPTO

def sys_staff_required(func):
    """
    Decorator for views that checks the user is system staff.
    """
    def _decorated(request, *args, **kwargs):
        if request.user.is_staff:
            return func(request, *args, **kwargs)
        raise Http404
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
                return render_to_response('options/set_user_options.html', {
                        }, context_instance=RequestContext(request))

            if (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
                    and not is_passwd_set(repo_id, username):
                return render_to_response('decrypt_repo_form.html', {
                        'repo': repo,
                        'next': request.get_full_path(),
                        'force_server_crypto': FORCE_SERVER_CRYPTO,
                        }, context_instance=RequestContext(request))

            if repo.enc_version == 2 and not server_crypto:
                return render_error(request, _(u'Files in this library can not be viewed online.'))

        return func(request, *args, **kwargs)
    return _decorated

