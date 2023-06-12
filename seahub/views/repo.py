# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import os
import posixpath
import logging

from django.urls import reverse
from django.db.models import F
from django.http import Http404, HttpResponseRedirect
from django.shortcuts import render
from django.utils.translation import gettext as _
from urllib.parse import quote

import seaserv
from seaserv import seafile_api

from seahub.auth.decorators import login_required
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.share.decorators import share_link_audit, share_link_login_required
from seahub.share.models import FileShare, UploadLinkShare, \
    check_share_link_common
from seahub.views import gen_path_link, get_repo_dirents, \
    check_folder_permission

from seahub.utils import gen_dir_share_link, \
    gen_shared_upload_link, render_error, \
    get_file_type_and_ext, get_service_url, normalize_dir_path
from seahub.utils.repo import is_repo_owner, get_repo_owner
from seahub.settings import ENABLE_UPLOAD_FOLDER, \
    ENABLE_RESUMABLE_FILEUPLOAD, ENABLE_VIDEO_THUMBNAIL, \
    THUMBNAIL_ROOT, THUMBNAIL_DEFAULT_SIZE, THUMBNAIL_SIZE_FOR_GRID, \
    MAX_NUMBER_OF_FILES_FOR_FILEUPLOAD, SHARE_LINK_EXPIRE_DAYS_MIN, \
    SHARE_LINK_EXPIRE_DAYS_MAX, SEAFILE_COLLAB_SERVER, \
    ENABLE_SHARE_LINK_REPORT_ABUSE
from seahub.utils.file_types import IMAGE, VIDEO, XMIND
from seahub.thumbnail.utils import get_share_link_thumbnail_src
from seahub.group.utils import is_group_admin
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner

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


def get_next_url_from_request(request):
    return request.GET.get('next', None)


def get_nav_path(path, repo_name):
    return gen_path_link(path, repo_name)


def is_no_quota(repo_id):
    return True if seaserv.check_quota(repo_id) < 0 else False


def get_fileshare(repo_id, username, path):
    if path == '/':    # no shared link for root dir
        return None

    share_list = FileShare.objects.filter(repo_id=repo_id).filter(
        username=username).filter(path=path)
    return share_list[0] if len(share_list) > 0 else None


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

    share_list = UploadLinkShare.objects.filter(repo_id=repo_id).filter(
        username=username).filter(path=path)
    return share_list[0] if len(share_list) > 0 else None


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

    path = request.GET.get('p', '/')
    path = normalize_dir_path(path)

    user_perm = check_folder_permission(request, repo.id, '/')
    if user_perm is None:
        return render_error(request, _('Permission denied'))

    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False

    reverse_url = reverse('lib_view', args=[repo_id, repo.name, ''])
    if repo.encrypted and \
        (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
            and not is_password_set(repo.id, username):
        return render(request, 'decrypt_repo_form.html', {
                'repo': repo,
                'next': get_next_url_from_request(request) or reverse_url,
                })

    commit_id = request.GET.get('commit_id', None)
    if commit_id is None:
        return HttpResponseRedirect(reverse_url)
    current_commit = get_commit(repo.id, repo.version, commit_id)
    if not current_commit:
        current_commit = get_commit(repo.id, repo.version, repo.head_cmmt_id)

    file_list, dir_list, dirent_more = get_repo_dirents(request, repo,
                                                        current_commit, path)
    zipped = get_nav_path(path, repo.name)

    repo_owner = seafile_api.get_repo_owner(repo.id)
    is_repo_owner = True if username == repo_owner else False

    referer = request.GET.get('referer', '')

    return render(request, 'repo_history_view.html', {
            'repo': repo,
            "is_repo_owner": is_repo_owner,
            'user_perm': user_perm,
            'current_commit': current_commit,
            'dir_list': dir_list,
            'file_list': file_list,
            'path': path,
            'zipped': zipped,
            'referer': referer,
            })


@login_required
def repo_snapshot(request, repo_id):
    """View repo in history.
    """
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    username = request.user.username
    user_perm = check_folder_permission(request, repo.id, '/')
    if user_perm is None:
        return render_error(request, _('Permission denied'))

    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False

    reverse_url = reverse('lib_view', args=[repo_id, repo.name, ''])
    if repo.encrypted and \
        (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
            and not is_password_set(repo.id, username):
        return render(request, 'decrypt_repo_form.html', {
                'repo': repo,
                'next': get_next_url_from_request(request) or reverse_url,
                })

    commit_id = request.GET.get('commit_id', None)
    if commit_id is None:
        return HttpResponseRedirect(reverse_url)
    current_commit = get_commit(repo.id, repo.version, commit_id)
    if not current_commit:
        current_commit = get_commit(repo.id, repo.version, repo.head_cmmt_id)

    has_perm = is_repo_owner(request, repo.id, username)
    # department admin
    if not has_perm:
        repo_owner = get_repo_owner(request, repo_id)
        if '@seafile_group' in repo_owner:
            group_id = get_group_id_by_repo_owner(repo_owner)
            has_perm = is_group_admin(group_id, username)

    return render(request, 'repo_snapshot_react.html', {
            'repo': repo,
            "can_restore_repo": has_perm,
            'current_commit': current_commit,
            })


@login_required
def view_lib_as_wiki(request, repo_id, path):

    if not path.startswith('/'):
        path = '/' + path

    repo = seafile_api.get_repo(repo_id)

    is_dir = None
    file_id = seafile_api.get_file_id_by_path(repo.id, path)
    if file_id:
        is_dir = False

    dir_id = seafile_api.get_dir_id_by_path(repo.id, path)
    if dir_id:
        is_dir = True

    user_perm = check_folder_permission(request, repo.id, '/')
    if user_perm is None:
        return render_error(request, _('Permission denied'))

    if user_perm == 'rw':
        user_can_write = True
    else:
        user_can_write = False

    return render(request, 'view_lib_as_wiki.html', {
        'seafile_collab_server': SEAFILE_COLLAB_SERVER,
        'repo_id': repo_id,
        'service_url': get_service_url().rstrip('/'),
        'initial_path': path,
        'is_dir': is_dir,
        'repo_name': repo.name,
        'permission': user_can_write,
        'share_link_expire_days_min': SHARE_LINK_EXPIRE_DAYS_MIN,
        'share_link_expire_days_max': SHARE_LINK_EXPIRE_DAYS_MAX,
        })


# shared dir/uploadlink
@share_link_audit
@share_link_login_required
def view_shared_dir(request, fileshare):

    token = fileshare.token

    password_check_passed, err_msg = check_share_link_common(request, fileshare)
    if not password_check_passed:
        d = {'token': token, 'view_name': 'view_shared_dir', 'err_msg': err_msg}
        return render(request, 'share_access_validation.html', d)

    username = fileshare.username
    repo_id = fileshare.repo_id

    # Get path from frontend, use '/' if missing, and construct request path
    # with fileshare.path to real path, used to fetch dirents by RPC.
    req_path = request.GET.get('p', '/')
    req_path = normalize_dir_path(req_path)

    if req_path == '/':
        real_path = fileshare.path
    else:
        real_path = posixpath.join(fileshare.path, req_path.lstrip('/'))

    real_path = normalize_dir_path(real_path)

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    if repo.encrypted or not \
            seafile_api.check_permission_by_path(repo_id, '/', username):
        return render_error(request, _('Permission denied'))

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

    permissions = fileshare.get_permissions()

    # mode to view dir/file items
    mode = request.GET.get('mode', 'list')
    if mode != 'list':
        mode = 'grid'
    thumbnail_size = THUMBNAIL_DEFAULT_SIZE if mode == 'list' else THUMBNAIL_SIZE_FOR_GRID

    for f in file_list:
        file_type, file_ext = get_file_type_and_ext(f.obj_name)
        if file_type == IMAGE:
            f.is_img = True
        if file_type == VIDEO:
            f.is_video = True

        if file_type in (IMAGE, XMIND) or \
                (file_type == VIDEO and ENABLE_VIDEO_THUMBNAIL):
            if os.path.exists(os.path.join(THUMBNAIL_ROOT, str(thumbnail_size), f.obj_id)):
                req_image_path = posixpath.join(req_path, f.obj_name)
                src = get_share_link_thumbnail_src(token, thumbnail_size, req_image_path)
                f.encoded_thumbnail_src = quote(src)

    # for 'upload file'
    no_quota = True if seaserv.check_quota(repo_id) < 0 else False

    template = 'view_shared_dir_react.html'

    dir_share_link = request.path
    desc_for_ogp = _('Share link for %s.') % dir_name

    return render(request, template, {
            'repo': repo,
            'token': token,
            'path': req_path,
            'username': username,
            'dir_name': dir_name,
            'dir_path': real_path,
            'file_list': file_list,
            'dir_list': dir_list,
            'zipped': zipped,
            'traffic_over_limit': False,
            'no_quota': no_quota,
            'permissions': permissions,
            'mode': mode,
            'thumbnail_size': thumbnail_size,
            'dir_share_link': dir_share_link,
            'desc_for_ogp': desc_for_ogp,
            'enable_share_link_report_abuse': ENABLE_SHARE_LINK_REPORT_ABUSE,
            'enable_video_thumbnail': ENABLE_VIDEO_THUMBNAIL,
            })


@share_link_audit
def view_shared_upload_link(request, uploadlink):
    token = uploadlink.token

    password_check_passed, err_msg = check_share_link_common(request,
                                                             uploadlink,
                                                             is_upload_link=True)
    if not password_check_passed:
        d = {'token': token, 'view_name': 'view_shared_upload_link', 'err_msg': err_msg}
        return render(request, 'share_access_validation.html', d)

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

    if repo.encrypted or \
            seafile_api.check_permission_by_path(repo_id, '/', username) != 'rw':
        return render_error(request, _('Permission denied'))

    uploadlink.view_cnt = F('view_cnt') + 1
    uploadlink.save()

    no_quota = True if seaserv.check_quota(repo_id) < 0 else False

    try:
        max_upload_file_size = seafile_api.get_server_config_int('fileserver', 'max_upload_size')
    except Exception as e:
        logger.error(e)
        max_upload_file_size = -1

    return render(request, 'view_shared_upload_link_react.html', {
            'repo': repo,
            'path': path,
            'username': username,
            'dir_name': dir_name,
            'max_upload_file_size': max_upload_file_size,
            'no_quota': no_quota,
            'uploadlink': uploadlink,
            'enable_upload_folder': ENABLE_UPLOAD_FOLDER,
            'enable_resumable_fileupload': ENABLE_RESUMABLE_FILEUPLOAD,
            'max_number_of_files_for_fileupload': MAX_NUMBER_OF_FILES_FOR_FILEUPLOAD,
            })
