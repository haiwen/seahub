# -*- coding: utf-8 -*-
import os
import posixpath
import logging

from django.core.urlresolvers import reverse
from django.db.models import F
from django.http import Http404, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils.http import urlquote

import seaserv
from seaserv import seafile_api

from seahub.auth.decorators import login_required
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.share.decorators import share_link_audit
from seahub.share.models import FileShare, UploadLinkShare, \
    check_share_link_common
from seahub.views import gen_path_link, get_repo_dirents, \
    check_folder_permission

from seahub.utils import gen_file_upload_url, gen_dir_share_link, \
    gen_shared_upload_link, user_traffic_over_limit, render_error, \
    get_file_type_and_ext
from seahub.settings import ENABLE_UPLOAD_FOLDER, \
    ENABLE_RESUMABLE_FILEUPLOAD, ENABLE_THUMBNAIL, \
    THUMBNAIL_ROOT, THUMBNAIL_DEFAULT_SIZE, THUMBNAIL_SIZE_FOR_GRID
from seahub.utils.file_types import IMAGE
from seahub.thumbnail.utils import get_share_link_thumbnail_src

# Get an instance of a logger
logger = logging.getLogger(__name__)

def get_repo(repo_id):
    return seafile_api.get_repo(repo_id)

def get_commit(repo_id, repo_version, commit_id):
    return seaserv.get_commit(repo_id, repo_version, commit_id)

def get_repo_size(repo_id):
    return seafile_api.get_repo_size(repo_id)

def is_password_set(repo_id, username):
    return seafile_api.is_password_set(repo_id, username)

def get_path_from_request(request):
    path = request.GET.get('p', '/')
    if path[-1] != '/':
        path = path + '/'
    return path

def get_next_url_from_request(request):
    return request.GET.get('next', None)

def get_nav_path(path, repo_name):
    return gen_path_link(path, repo_name)

def is_no_quota(repo_id):
    return True if seaserv.check_quota(repo_id) < 0 else False

def get_upload_url(request, repo_id):
    username = request.user.username
    if check_folder_permission(request, repo_id, '/') == 'rw':
        token = seafile_api.get_fileserver_access_token(repo_id, 'dummy',
                                                        'upload', username)
        return gen_file_upload_url(token, 'upload')
    else:
        return ''

def get_fileshare(repo_id, username, path):
    if path == '/':    # no shared link for root dir
        return None

    l = FileShare.objects.filter(repo_id=repo_id).filter(
        username=username).filter(path=path)
    return l[0] if len(l) > 0 else None

def get_dir_share_link(fileshare):
    # dir shared link
    if fileshare:
        dir_shared_link = gen_dir_share_link(fileshare.token)
    else:
        dir_shared_link = ''
    return dir_shared_link

def get_uploadlink(repo_id, username, path):
    if path == '/':    # no shared upload link for root dir
        return None

    l = UploadLinkShare.objects.filter(repo_id=repo_id).filter(
        username=username).filter(path=path)
    return l[0] if len(l) > 0 else None

def get_dir_shared_upload_link(uploadlink):
    # dir shared upload link
    if uploadlink:
        dir_shared_upload_link = gen_shared_upload_link(uploadlink.token)
    else:
        dir_shared_upload_link = ''
    return dir_shared_upload_link

@login_required
def repo_history_view(request, repo_id):
    """View repo in history.
    """
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    username = request.user.username
    path = get_path_from_request(request)
    user_perm = check_folder_permission(request, repo.id, '/')
    if user_perm is None:
        return render_error(request, _(u'Permission denied'))

    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False

    if repo.encrypted and \
        (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
        and not is_password_set(repo.id, username):
        return render_to_response('decrypt_repo_form.html', {
                'repo': repo,
                'next': get_next_url_from_request(request) or reverse("view_common_lib_dir", args=[repo_id, '']),
                }, context_instance=RequestContext(request))

    commit_id = request.GET.get('commit_id', None)
    if commit_id is None:
        return HttpResponseRedirect(reverse("view_common_lib_dir", args=[repo_id, '']))
    current_commit = get_commit(repo.id, repo.version, commit_id)
    if not current_commit:
        current_commit = get_commit(repo.id, repo.version, repo.head_cmmt_id)

    file_list, dir_list, dirent_more = get_repo_dirents(request, repo,
                                                        current_commit, path)
    zipped = get_nav_path(path, repo.name)

    repo_owner = seafile_api.get_repo_owner(repo.id)
    is_repo_owner = True if username == repo_owner else False

    return render_to_response('repo_history_view.html', {
            'repo': repo,
            "is_repo_owner": is_repo_owner,
            'user_perm': user_perm,
            'current_commit': current_commit,
            'dir_list': dir_list,
            'file_list': file_list,
            'path': path,
            'zipped': zipped,
            }, context_instance=RequestContext(request))

########## shared dir/uploadlink
@share_link_audit
def view_shared_dir(request, fileshare):
    token = fileshare.token

    password_check_passed, err_msg = check_share_link_common(request, fileshare)
    if not password_check_passed:
        d = {'token': token, 'view_name': 'view_shared_dir', 'err_msg': err_msg}
        return render_to_response('share_access_validation.html', d,
                                  context_instance=RequestContext(request))

    username = fileshare.username
    repo_id = fileshare.repo_id

    # Get path from frontend, use '/' if missing, and construct request path
    # with fileshare.path to real path, used to fetch dirents by RPC.
    req_path = request.GET.get('p', '/')
    if req_path[-1] != '/':
        req_path += '/'

    if req_path == '/':
        real_path = fileshare.path
    else:
        real_path = posixpath.join(fileshare.path, req_path.lstrip('/'))
    if real_path[-1] != '/':         # Normalize dir path
        real_path += '/'

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # Check path still exist, otherwise show error
    if not seafile_api.get_dir_id_by_path(repo.id, fileshare.path):
        return render_error(request, _('"%s" does not exist.') % fileshare.path)

    if fileshare.path == '/':
        # use repo name as dir name if share whole library
        dir_name = repo.name
    else:
        dir_name = os.path.basename(real_path[:-1])

    current_commit = seaserv.get_commits(repo_id, 0, 1)[0]
    file_list, dir_list, dirent_more = get_repo_dirents(request, repo,
                                                        current_commit, real_path)

    # generate dir navigator
    if fileshare.path == '/':
        zipped = gen_path_link(req_path, repo.name)
    else:
        zipped = gen_path_link(req_path, os.path.basename(fileshare.path[:-1]))

    if req_path == '/':  # When user view the root of shared dir..
        # increase shared link view_cnt,
        fileshare = FileShare.objects.get(token=token)
        fileshare.view_cnt = F('view_cnt') + 1
        fileshare.save()

    traffic_over_limit = user_traffic_over_limit(fileshare.username)

    # mode to view dir/file items
    mode = request.GET.get('mode', 'list')
    if mode != 'list':
        mode = 'grid'
    thumbnail_size = THUMBNAIL_DEFAULT_SIZE if mode == 'list' else THUMBNAIL_SIZE_FOR_GRID

    if not repo.encrypted and ENABLE_THUMBNAIL:
        for f in file_list:
            file_type, file_ext = get_file_type_and_ext(f.obj_name)
            if file_type == IMAGE:
                f.is_img = True
                if os.path.exists(os.path.join(THUMBNAIL_ROOT, str(thumbnail_size), f.obj_id)):
                    req_image_path = posixpath.join(req_path, f.obj_name)
                    src = get_share_link_thumbnail_src(token, thumbnail_size, req_image_path)
                    f.encoded_thumbnail_src = urlquote(src)

    return render_to_response('view_shared_dir.html', {
            'repo': repo,
            'token': token,
            'path': req_path,
            'username': username,
            'dir_name': dir_name,
            'file_list': file_list,
            'dir_list': dir_list,
            'zipped': zipped,
            'traffic_over_limit': traffic_over_limit,
            'ENABLE_THUMBNAIL': ENABLE_THUMBNAIL,
            'mode': mode,
            'thumbnail_size': thumbnail_size,
            }, context_instance=RequestContext(request))

@share_link_audit
def view_shared_upload_link(request, uploadlink):
    token = uploadlink.token

    password_check_passed, err_msg = check_share_link_common(request,
                                                             uploadlink,
                                                             is_upload_link=True)
    if not password_check_passed:
        d = {'token': token, 'view_name': 'view_shared_upload_link', 'err_msg': err_msg}
        return render_to_response('share_access_validation.html', d,
                                  context_instance=RequestContext(request))

    username = uploadlink.username
    repo_id = uploadlink.repo_id
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    path = uploadlink.path
    if path == '/':
        # use repo name as dir name if share whole library
        dir_name = repo.name
    else:
        dir_name = os.path.basename(path[:-1])

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    uploadlink.view_cnt = F('view_cnt') + 1
    uploadlink.save()

    no_quota = True if seaserv.check_quota(repo_id) < 0 else False

    return render_to_response('view_shared_upload_link.html', {
            'repo': repo,
            'path': path,
            'username': username,
            'dir_name': dir_name,
            'max_upload_file_size': seaserv.MAX_UPLOAD_FILE_SIZE,
            'no_quota': no_quota,
            'uploadlink': uploadlink,
            'enable_upload_folder': ENABLE_UPLOAD_FOLDER,
            'enable_resumable_fileupload': ENABLE_RESUMABLE_FILEUPLOAD,
            }, context_instance=RequestContext(request))
