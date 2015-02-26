# -*- coding: utf-8 -*-
import os
import stat
import logging
import json
import posixpath

from django.core.urlresolvers import reverse
from django.http import HttpResponse, Http404, HttpResponseBadRequest
from django.template import RequestContext
from django.template.loader import render_to_string
from django.utils.http import urlquote
from django.utils.translation import ugettext as _
from django.template.defaultfilters import filesizeformat

import seaserv
from seaserv import seafile_api, seafserv_rpc, is_passwd_set, \
    get_related_users_by_repo, get_related_users_by_org_repo, \
    CALC_SHARE_USAGE, seafserv_threaded_rpc, ccnet_threaded_rpc, \
    get_user_quota_usage, get_user_share_usage
from pysearpc import SearpcError

from seahub.auth.decorators import login_required_ajax
from seahub.contacts.models import Contact
from seahub.forms import RepoNewDirentForm, RepoRenameDirentForm, \
    RepoCreateForm, SharedRepoCreateForm
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.notifications.models import UserNotification
from seahub.notifications.views import add_notice_from_info
from seahub.message.models import UserMessage
from seahub.share.models import UploadLinkShare
from seahub.signals import upload_file_successful, repo_created, repo_deleted
from seahub.views import get_repo_dirents, validate_owner, \
    check_repo_access_permission, get_unencry_rw_repos_by_user, \
    get_system_default_repo_id, get_diff, group_events_data, \
    get_owned_repo_list

from seahub.views.repo import get_nav_path, get_fileshare, get_dir_share_link, \
    get_uploadlink, get_dir_shared_upload_link
import seahub.settings as settings
from seahub.settings import ENABLE_THUMBNAIL, THUMBNAIL_ROOT, \
    THUMBNAIL_DEFAULT_SIZE
from seahub.utils import check_filename_with_rename, EMPTY_SHA1, \
    gen_block_get_url, TRAFFIC_STATS_ENABLED, get_user_traffic_stat,\
    new_merge_with_no_conflict, get_commit_before_new_merge, \
    get_repo_last_modify, gen_file_upload_url, is_org_context, \
    get_org_user_events, get_user_events, get_file_type_and_ext
from seahub.utils.star import star_file, unstar_file
from seahub.base.accounts import User
from seahub.utils.file_types import IMAGE
from seahub.thumbnail.utils import get_thumbnail_src
from seahub.base.templatetags.seahub_tags import translate_seahub_time, file_icon_filter

# Get an instance of a logger
logger = logging.getLogger(__name__)

########## Seafile API Wrapper
def get_repo(repo_id):
    return seafile_api.get_repo(repo_id)

def get_commit(repo_id, repo_version, commit_id):
    return seaserv.get_commit(repo_id, repo_version, commit_id)

def get_group(gid):
    return seaserv.get_group(gid)

def is_group_user(gid, username):
    return seaserv.is_group_user(gid, username)

########## repo related
@login_required_ajax
def get_dirents(request, repo_id):
    """
    Get dirents in a dir for file tree
    """
    content_type = 'application/json; charset=utf-8'

    # permission checking
    user_perm = check_repo_access_permission(repo_id, request.user)
    if user_perm is None:
        err_msg = _(u"You don't have permission to access the library.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    path = request.GET.get('path', '')
    dir_only = request.GET.get('dir_only', False)
    all_dir = request.GET.get('all_dir', False)
    if not path:
        err_msg = _(u"No path.")
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    # get dirents for every path element
    if all_dir:
        all_dirents = []
        path_eles = path.split('/')[:-1]
        for i, x in enumerate(path_eles):
            ele_path = '/'.join(path_eles[:i+1]) + '/'
            try:
                ele_path_dirents = seafile_api.list_dir_by_path(repo_id, ele_path.encode('utf-8'))
            except SearpcError, e:
                ele_path_dirents = []
            ds = []
            for d in ele_path_dirents:
                if stat.S_ISDIR(d.mode):
                    ds.append(d.obj_name)
            ds.sort(lambda x, y : cmp(x.lower(), y.lower()))
            all_dirents.append(ds)
        return HttpResponse(json.dumps(all_dirents), content_type=content_type)

    # get dirents in path
    try:
        dirents = seafile_api.list_dir_by_path(repo_id, path.encode('utf-8'))
    except SearpcError, e:
        return HttpResponse(json.dumps({"error": e.msg}), status=500,
                            content_type=content_type)

    d_list = []
    f_list = []
    for dirent in dirents:
        if stat.S_ISDIR(dirent.mode):
            dirent.has_subdir = False

            if dir_only:
                dirent_path = os.path.join(path, dirent.obj_name)
                try:
                    dirent_dirents = seafile_api.list_dir_by_path(repo_id, dirent_path.encode('utf-8'))
                except SearpcError, e:
                    dirent_dirents = []
                for dirent_dirent in dirent_dirents:
                    if stat.S_ISDIR(dirent_dirent.props.mode):
                        dirent.has_subdir = True
                        break

            subdir = {
                'name': dirent.obj_name,
                'id': dirent.obj_id,
                'type': 'dir',
                'has_subdir': dirent.has_subdir, # to decide node 'state' ('closed' or not) in jstree
            }
            d_list.append(subdir)
        else:
            if not dir_only:
                f = {
                    'id': dirent.obj_id,
                    'name': dirent.obj_name,
                    'type': 'file',
                    }
                f_list.append(f)

    d_list.sort(lambda x, y : cmp(x['name'].lower(), y['name'].lower()))
    f_list.sort(lambda x, y : cmp(x['name'].lower(), y['name'].lower()))
    return HttpResponse(json.dumps(d_list + f_list), content_type=content_type)

@login_required_ajax
def get_unenc_group_repos(request, group_id):
    '''
    Get unenc repos in a group.
    '''
    content_type = 'application/json; charset=utf-8'

    group_id_int = int(group_id)
    group = get_group(group_id_int)
    if not group:
        err_msg = _(u"The group doesn't exist")
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    joined = is_group_user(group_id_int, request.user.username)
    if not joined and not request.user.is_staff:
        err_msg = _(u"Permission denied")
        return HttpResponse(json.dumps({"error": err_msg}), status=403,
                            content_type=content_type)

    repo_list = []
    if is_org_context(request):
        org_id = request.user.org.org_id
        repos = seafile_api.get_org_group_repos(org_id, group_id_int)
        for repo in repos:
            if not repo.encrypted:
                repo_list.append({"name": repo.repo_name, "id": repo.repo_id})
    else:
        repos = seafile_api.get_group_repo_list(group_id_int)
        for repo in repos:
            if not repo.encrypted:
                repo_list.append({"name": repo.name, "id": repo.id})

    repo_list.sort(lambda x, y : cmp(x['name'].lower(), y['name'].lower()))
    return HttpResponse(json.dumps(repo_list), content_type=content_type)

@login_required_ajax
def get_my_unenc_repos(request):
    """Get my owned and unencrypted repos.
    """
    content_type = 'application/json; charset=utf-8'

    repos = get_owned_repo_list(request)
    repo_list = []
    for repo in repos:
        if repo.encrypted or repo.is_virtual:
            continue
        repo_list.append({"name": repo.name, "id": repo.id})

    repo_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))
    return HttpResponse(json.dumps(repo_list), content_type=content_type)

@login_required_ajax
def unenc_rw_repos(request):
    """Get a user's unencrypt repos that he/she can read-write.

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'
    acc_repos = get_unencry_rw_repos_by_user(request)

    repo_list = []
    for repo in acc_repos:
        repo_list.append({"name": repo.name, "id": repo.id})

    repo_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))
    return HttpResponse(json.dumps(repo_list), content_type=content_type)

@login_required_ajax
def list_dir(request, repo_id):
    """
    List directory entries in AJAX.
    """
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)

    username = request.user.username
    user_perm = check_repo_access_permission(repo.id, request.user)
    if user_perm is None:
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    sub_lib_enabled = UserOptions.objects.is_sub_lib_enabled(username)

    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False

    if repo.encrypted and \
            (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
            and not seafile_api.is_password_set(repo.id, username):
        err_msg = _(u'Library is encrypted.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    head_commit = get_commit(repo.id, repo.version, repo.head_cmmt_id)
    if not head_commit:
        err_msg = _(u'Error: no head commit id')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=500, content_type=content_type)

    if new_merge_with_no_conflict(head_commit):
        info_commit = get_commit_before_new_merge(head_commit)
    else:
        info_commit = head_commit

    path = request.GET.get('p', '/')
    if path[-1] != '/':
        path = path + '/'

    more_start = None
    file_list, dir_list, dirent_more = get_repo_dirents(request, repo, head_commit, path, offset=0, limit=100)
    if dirent_more:
        more_start = 100
    zipped = get_nav_path(path, repo.name)
    fileshare = get_fileshare(repo.id, username, path)
    dir_shared_link = get_dir_share_link(fileshare)
    uploadlink = get_uploadlink(repo.id, username, path)
    dir_shared_upload_link = get_dir_shared_upload_link(uploadlink)

    if not repo.encrypted and ENABLE_THUMBNAIL:
        size = THUMBNAIL_DEFAULT_SIZE
        for f in file_list:
            file_type, file_ext = get_file_type_and_ext(f.obj_name)
            if file_type == IMAGE:
                f.is_img = True
                if os.path.exists(os.path.join(THUMBNAIL_ROOT, size, f.obj_id)):
                    f.thumbnail_src = get_thumbnail_src(repo.id, f.obj_id, size)

    ctx = {
        'repo': repo,
        'zipped': zipped,
        'user_perm': user_perm,
        'path': path,
        'server_crypto': server_crypto,
        'fileshare': fileshare,
        'dir_shared_link': dir_shared_link,
        'uploadlink': uploadlink,
        'dir_shared_upload_link': dir_shared_upload_link,
        'dir_list': dir_list,
        'file_list': file_list,
        'dirent_more': dirent_more,
        'more_start': more_start,
        'ENABLE_SUB_LIBRARY': settings.ENABLE_SUB_LIBRARY,
        'sub_lib_enabled': sub_lib_enabled,
        'enable_upload_folder': settings.ENABLE_UPLOAD_FOLDER,
        'current_commit': head_commit,
        'info_commit': info_commit,
        'ENABLE_THUMBNAIL': ENABLE_THUMBNAIL,
    }
    html = render_to_string('snippets/repo_dir_data.html', ctx,
                            context_instance=RequestContext(request))
    return HttpResponse(json.dumps({'html': html, 'path': path}),
                        content_type=content_type)

@login_required_ajax
def list_dir_more(request, repo_id):
    """
    List 'more' entries in a directory with AJAX.
    """
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)

    username = request.user.username
    user_perm = check_repo_access_permission(repo.id, request.user)
    if user_perm is None:
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    sub_lib_enabled = UserOptions.objects.is_sub_lib_enabled(username)

    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False

    if repo.encrypted and \
            (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
           and not seafile_api.is_password_set(repo.id, username):
        err_msg = _(u'Library is encrypted.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    head_commit = get_commit(repo.id, repo.version, repo.head_cmmt_id)
    if not head_commit:
        err_msg = _(u'Error: no head commit id')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=500, content_type=content_type)

    path = request.GET.get('p', '/')
    if path[-1] != '/':
        path = path + '/'

    offset = int(request.GET.get('start'))
    if not offset:
        err_msg = _(u'Argument missing')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)
    more_start = None
    file_list, dir_list, dirent_more = get_repo_dirents(request, repo, head_commit, path, offset, limit=100)
    if dirent_more:
        more_start = offset + 100

    if not repo.encrypted and ENABLE_THUMBNAIL:
        size = THUMBNAIL_DEFAULT_SIZE
        for f in file_list:
            file_type, file_ext = get_file_type_and_ext(f.obj_name)
            if file_type == IMAGE:
                f.is_img = True
                if os.path.exists(os.path.join(THUMBNAIL_ROOT, size, f.obj_id)):
                    f.thumbnail_src = get_thumbnail_src(repo.id, f.obj_id, size)

    ctx = {
        'repo': repo,
        'user_perm': user_perm,
        'path': path,
        'server_crypto': server_crypto,
        'dir_list': dir_list,
        'file_list': file_list,
        'ENABLE_SUB_LIBRARY': settings.ENABLE_SUB_LIBRARY,
        'sub_lib_enabled': sub_lib_enabled,
        'ENABLE_THUMBNAIL': ENABLE_THUMBNAIL,
    }
    html = render_to_string('snippets/repo_dirents.html', ctx,
                            context_instance=RequestContext(request))
    return HttpResponse(json.dumps({'html': html, 'dirent_more': dirent_more, 'more_start': more_start}),
                        content_type=content_type)

@login_required_ajax
def list_lib_dir(request, repo_id):
    '''
        New ajax API for list library directory
    '''
    content_type = 'application/json; charset=utf-8'
    result = {}

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)

    username = request.user.username
    user_perm = check_repo_access_permission(repo.id, request.user)
    if user_perm is None:
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    if repo.encrypted \
            and not seafile_api.is_password_set(repo.id, username):
        err_msg = _(u'Library is encrypted.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    head_commit = get_commit(repo.id, repo.version, repo.head_cmmt_id)
    if not head_commit:
        err_msg = _(u'Error: no head commit id')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=500, content_type=content_type)

    path = request.GET.get('p', '/')
    if path[-1] != '/':
        path = path + '/'

    offset = int(request.GET.get('start', 0))
    file_list, dir_list, dirent_more = get_repo_dirents(request, repo, head_commit, path, offset, limit=100)
    more_start = None
    if dirent_more:
        more_start = offset + 100

    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)
    result["is_repo_owner"] = True if repo_owner == username else False

    result["is_virtual"] = repo.is_virtual
    result["repo_name"] = repo.name
    result["user_perm"] = user_perm
    result["encrypted"] = repo.encrypted

    result["dirent_more"] = dirent_more
    result["more_start"] = more_start

    if path != '/' and not repo.encrypted:
        fileshare = get_fileshare(repo.id, username, path)
        dir_shared_link = get_dir_share_link(fileshare)
        uploadlink = get_uploadlink(repo.id, username, path)
        dir_shared_upload_link = get_dir_shared_upload_link(uploadlink)

        token = fileshare.token if fileshare is not None else ''
        upload_token = uploadlink.token if uploadlink is not None else ''

        result["share"] = {
            "link": dir_shared_link,
            "token": token,
            "upload_link": dir_shared_upload_link,
            "upload_token": upload_token
        }

    dirent_list = []
    for d in dir_list:
        d_ = {}
        d_['is_dir'] = True
        d_['obj_name'] = d.obj_name
        d_['last_modified'] = d.last_modified
        d_['last_update'] = translate_seahub_time(d.last_modified)
        p_dpath = posixpath.join(path, d.obj_name)
        d_['p_dpath'] = p_dpath # for 'view_link' & 'dl_link'
        d_['sharelink'] = d.sharelink
        d_['sharetoken'] = d.sharetoken
        d_['uploadlink'] = d.uploadlink
        d_['uploadtoken'] = d.uploadtoken
        dirent_list.append(d_)

    if not repo.encrypted and ENABLE_THUMBNAIL:
        size = THUMBNAIL_DEFAULT_SIZE
        for f in file_list:
            file_type, file_ext = get_file_type_and_ext(f.obj_name)
            if file_type == IMAGE:
                f.is_img = True
                if os.path.exists(os.path.join(THUMBNAIL_ROOT, size, f.obj_id)):
                    f.thumbnail_src = get_thumbnail_src(repo.id, f.obj_id, size)

    for f in file_list:
        f_ = {}
        f_['is_file'] = True
        f_['file_icon'] = file_icon_filter(f.obj_name)
        f_['obj_name'] = f.obj_name
        f_['last_modified'] = f.last_modified
        f_['last_update'] = translate_seahub_time(f.last_modified)
        f_['starred'] = f.starred
        f_['file_size'] = filesizeformat(f.file_size)
        f_['obj_id'] = f.obj_id
        f_['sharelink'] = f.sharelink
        f_['sharetoken'] = f.sharetoken
        if f.is_img:
            f_['is_img'] = f.is_img
        if f.thumbnail_src:
            f_['thumbnail_src'] = f.thumbnail_src
        dirent_list.append(f_)

    result["dirent_list"] = dirent_list

    return HttpResponse(json.dumps(result), content_type=content_type)


def new_dirent_common(func):
    """Decorator for common logic in creating directory and file.
    """
    def _decorated(request, repo_id, *args, **kwargs):
        if request.method != 'POST':
            raise Http404

        result = {}
        content_type = 'application/json; charset=utf-8'

        repo = get_repo(repo_id)
        if not repo:
            result['error'] = _(u'Library does not exist.')
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)

        # permission checking
        username = request.user.username
        if check_repo_access_permission(repo.id, request.user) != 'rw':
            result['error'] = _('Permission denied')
            return HttpResponse(json.dumps(result), status=403,
                                content_type=content_type)

        # form validation
        form = RepoNewDirentForm(request.POST)
        if form.is_valid():
            dirent_name = form.cleaned_data["dirent_name"]
        else:
            result['error'] = str(form.errors.values()[0])
            return HttpResponse(json.dumps(result), status=400,
                            content_type=content_type)

        # arguments checking
        parent_dir = request.GET.get('parent_dir', None)
        if not parent_dir:
            result['error'] = _('Argument missing')
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)

        # rename duplicate name
        dirent_name = check_filename_with_rename(repo.id, parent_dir,
                                                 dirent_name)
        return func(repo.id, parent_dir, dirent_name, username)
    return _decorated

@login_required_ajax
@new_dirent_common
def new_dir(repo_id, parent_dir, dirent_name, username):
    """
    Create a new dir with ajax.
    """
    result = {}
    content_type = 'application/json; charset=utf-8'

    # create new dirent
    try:
        seafile_api.post_dir(repo_id, parent_dir, dirent_name, username)
    except SearpcError, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)

    return HttpResponse(json.dumps({'success': True, 'name': dirent_name}),
                        content_type=content_type)

@login_required_ajax
@new_dirent_common
def new_file(repo_id, parent_dir, dirent_name, username):
    """
    Create a new file with ajax.
    """
    result = {}
    content_type = 'application/json; charset=utf-8'

    # create new dirent
    try:
        seafile_api.post_empty_file(repo_id, parent_dir, dirent_name, username)
    except SearpcError, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)

    return HttpResponse(json.dumps({'success': True, 'name': dirent_name}),
                        content_type=content_type)

@login_required_ajax
def rename_dirent(request, repo_id):
    """
    Rename a file/dir in a repo, with ajax
    """
    if request.method != 'POST':
        raise Http404

    result = {}
    username = request.user.username
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        result['error'] = _(u'Library does not exist.')
        return HttpResponse(json.dumps(result), status=400,
                            content_type=content_type)

    # permission checking
    if check_repo_access_permission(repo.id, request.user) != 'rw':
        result['error'] = _('Permission denied')
        return HttpResponse(json.dumps(result), status=403,
                            content_type=content_type)

    # form validation
    form = RepoRenameDirentForm(request.POST)
    if form.is_valid():
        oldname = form.cleaned_data["oldname"]
        newname = form.cleaned_data["newname"]
    else:
        result['error'] = str(form.errors.values()[0])
        return HttpResponse(json.dumps(result), status=400,
                            content_type=content_type)

    if newname == oldname:
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)

    # argument checking
    parent_dir = request.GET.get('parent_dir', None)
    if not parent_dir:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400,
                            content_type=content_type)

    # rename duplicate name
    newname = check_filename_with_rename(repo_id, parent_dir, newname)

    # rename file/dir
    try:
        seafile_api.rename_file(repo_id, parent_dir, oldname, newname, username)
    except SearpcError, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)

    return HttpResponse(json.dumps({'success': True, 'newname': newname}),
                        content_type=content_type)

@login_required_ajax
def delete_dirent(request, repo_id):
    """
    Delete a file/dir with ajax.
    """
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    # permission checking
    username = request.user.username
    if check_repo_access_permission(repo.id, request.user) != 'rw':
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=403, content_type=content_type)

    # argument checking
    parent_dir = request.GET.get("parent_dir", None)
    dirent_name = request.GET.get("name", None)
    if not (parent_dir and dirent_name):
        err_msg = _(u'Argument missing.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    # delete file/dir
    try:
        seafile_api.del_file(repo_id, parent_dir, dirent_name, username)
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)
    except SearpcError, e:
        logger.error(e)
        err_msg = _(u'Internal error. Failed to delete %s.') % dirent_name
        return HttpResponse(json.dumps({'error': err_msg}),
                status=500, content_type=content_type)

@login_required_ajax
def delete_dirents(request, repo_id):
    """
    Delete multi files/dirs with ajax.
    """
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    # permission checking
    username = request.user.username
    if check_repo_access_permission(repo.id, request.user) != 'rw':
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=403, content_type=content_type)

    # argument checking
    parent_dir = request.GET.get("parent_dir")
    dirents_names = request.POST.getlist('dirents_names')
    if not (parent_dir and dirents_names):
        err_msg = _(u'Argument missing.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    deleted = []
    undeleted = []
    for dirent_name in dirents_names:
        try:
            seafile_api.del_file(repo_id, parent_dir, dirent_name, username)
            deleted.append(dirent_name)
        except SearpcError, e:
            logger.error(e)
            undeleted.append(dirent_name)

    return HttpResponse(json.dumps({'deleted': deleted, 'undeleted': undeleted}),
                        content_type=content_type)

def copy_move_common(func):
    """Decorator for common logic in copying/moving dir/file.
    """
    def _decorated(request, repo_id, *args, **kwargs):
        if request.method != 'POST':
            raise Http404

        result = {}
        content_type = 'application/json; charset=utf-8'

        repo = get_repo(repo_id)
        if not repo:
            result['error'] = _(u'Library does not exist.')
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)

        # permission checking
        username = request.user.username
        if check_repo_access_permission(repo.id, request.user) != 'rw':
            result['error'] = _('Permission denied')
            return HttpResponse(json.dumps(result), status=403,
                                content_type=content_type)


        # arguments validation
        path = request.GET.get('path')
        obj_name = request.GET.get('obj_name')
        dst_repo_id = request.POST.get('dst_repo')
        dst_path = request.POST.get('dst_path')

        if not (path and obj_name and dst_repo_id and dst_path):
            result['error'] = _('Argument missing')
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)

        # check file path
        if len(dst_path+obj_name) > settings.MAX_PATH:
            result['error'] =  _('Destination path is too long.')
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)

        # check whether user has write permission to dest repo
        if check_repo_access_permission(dst_repo_id, request.user) != 'rw':
            result['error'] = _('Permission denied')
            return HttpResponse(json.dumps(result), status=403,
                                content_type=content_type)

        # do nothing when dst is the same as src
        if repo_id == dst_repo_id and path == dst_path:
            result['error'] = _('Invalid destination path')
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)
        return func(repo_id, path, dst_repo_id, dst_path, obj_name, username)
    return _decorated

@login_required_ajax
@copy_move_common
def mv_file(src_repo_id, src_path, dst_repo_id, dst_path, obj_name, username):
    result = {}
    content_type = 'application/json; charset=utf-8'

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    try:
        res = seafile_api.move_file(src_repo_id, src_path, obj_name,
                          dst_repo_id, dst_path, new_obj_name, username, need_progress=1)
    except SearpcError, e:
        res = None

    # res can be None or an object
    if not res:
        result['error'] = _(u'Internal server error')
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    result['success'] = True
    msg = _(u'Successfully moved %(name)s') % {"name":obj_name}
    result['msg'] = msg
    if res.background:
        result['task_id'] = res.task_id

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
@copy_move_common
def cp_file(src_repo_id, src_path, dst_repo_id, dst_path, obj_name, username):
    result = {}
    content_type = 'application/json; charset=utf-8'

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    try:
        res = seafile_api.copy_file(src_repo_id, src_path, obj_name,
                          dst_repo_id, dst_path, new_obj_name, username, need_progress=1)
    except SearpcError, e:
        res = None

    if not res:
        result['error'] = _(u'Internal server error')
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    result['success'] = True
    msg = _(u'Successfully copied %(name)s') % {"name":obj_name}
    result['msg'] = msg

    if res.background:
        result['task_id'] = res.task_id

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
@copy_move_common
def mv_dir(src_repo_id, src_path, dst_repo_id, dst_path, obj_name, username):
    result = {}
    content_type = 'application/json; charset=utf-8'

    src_dir = os.path.join(src_path, obj_name)
    if dst_path.startswith(src_dir + '/'):
        error_msg = _(u'Can not move directory %(src)s to its subdirectory %(des)s') \
            % {'src': src_dir, 'des': dst_path}
        result['error'] = error_msg
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    try:
        res = seafile_api.move_file(src_repo_id, src_path, obj_name,
                          dst_repo_id, dst_path, new_obj_name, username, need_progress=1)
    except SearpcError, e:
        res = None

    # res can be None or an object
    if not res:
        result['error'] = _(u'Internal server error')
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    result['success'] = True
    msg = _(u'Successfully moved %(name)s') % {"name":obj_name}
    result['msg'] = msg
    if res.background:
        result['task_id'] = res.task_id

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
@copy_move_common
def cp_dir(src_repo_id, src_path, dst_repo_id, dst_path, obj_name, username):
    result = {}
    content_type = 'application/json; charset=utf-8'

    src_dir = os.path.join(src_path, obj_name)
    if dst_path.startswith(src_dir):
        error_msg = _(u'Can not copy directory %(src)s to its subdirectory %(des)s') \
            % {'src': src_dir, 'des': dst_path}
        result['error'] = error_msg
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    try:
        res = seafile_api.copy_file(src_repo_id, src_path, obj_name,
                          dst_repo_id, dst_path, new_obj_name, username, need_progress=1)
    except SearpcError, e:
        res = None

    # res can be None or an object
    if not res:
        result['error'] = _(u'Internal server error')
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    result['success'] = True
    msg = _(u'Successfully copied %(name)s') % {"name":obj_name}
    result['msg'] = msg
    if res.background:
        result['task_id'] = res.task_id

    return HttpResponse(json.dumps(result), content_type=content_type)


def dirents_copy_move_common(func):
    """
    Decorator for common logic in copying/moving dirs/files.
    """
    def _decorated(request, repo_id, *args, **kwargs):

        if request.method != 'POST':
            raise Http404

        result = {}
        content_type = 'application/json; charset=utf-8'

        repo = get_repo(repo_id)
        if not repo:
            result['error'] = _(u'Library does not exist.')
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)

        # permission checking
        username = request.user.username
        if check_repo_access_permission(repo.id, request.user) != 'rw':
            result['error'] = _('Permission denied')
            return HttpResponse(json.dumps(result), status=403,
                                content_type=content_type)

        # arguments validation
        parent_dir = request.GET.get('parent_dir')
        obj_file_names = request.POST.getlist('file_names')
        obj_dir_names = request.POST.getlist('dir_names')
        dst_repo_id = request.POST.get('dst_repo')
        dst_path = request.POST.get('dst_path')

        if not (parent_dir and dst_repo_id and dst_path) and not (obj_file_names or obj_dir_names):
            result['error'] = _('Argument missing')
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)

        # check file path
        for obj_name in obj_file_names + obj_dir_names:
            if len(dst_path+obj_name) > settings.MAX_PATH:
                result['error'] =  _('Destination path is too long for %s.') % obj_name
                return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)

        # check whether user has write permission to dest repo
        if check_repo_access_permission(dst_repo_id, request.user) != 'rw':
            result['error'] = _('Permission denied')
            return HttpResponse(json.dumps(result), status=403,
                                content_type=content_type)

        # when dst is the same as src
        if repo_id == dst_repo_id and parent_dir == dst_path:
            result['error'] = _('Invalid destination path')
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)

        return func(repo_id, parent_dir, dst_repo_id, dst_path, obj_file_names, obj_dir_names, username)
    return _decorated

@login_required_ajax
@dirents_copy_move_common
def mv_dirents(src_repo_id, src_path, dst_repo_id, dst_path, obj_file_names, obj_dir_names, username):
    result = {}
    content_type = 'application/json; charset=utf-8'

    for obj_name in obj_dir_names:
        src_dir = os.path.join(src_path, obj_name)
        if dst_path.startswith(src_dir + '/'):
            error_msg = _(u'Can not move directory %(src)s to its subdirectory %(des)s') \
                % {'src': src_dir, 'des': dst_path}
            result['error'] = error_msg
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    success = []
    failed = []
    url = None
    for obj_name in obj_file_names + obj_dir_names:
        new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)
        try:
            res = seafile_api.move_file(src_repo_id, src_path, obj_name,
                                  dst_repo_id, dst_path, new_obj_name, username, need_progress=1)
        except SearpcError, e:
            res = None

        if not res:
            failed.append(obj_name)
        else:
            success.append(obj_name)

    if len(success) > 0:
        url = reverse('repo', args=[dst_repo_id]) + '?p=' + urlquote(dst_path)

    result = {'success': success, 'failed': failed, 'url': url}
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
@dirents_copy_move_common
def cp_dirents(src_repo_id, src_path, dst_repo_id, dst_path, obj_file_names, obj_dir_names, username):
    result = {}
    content_type = 'application/json; charset=utf-8'

    for obj_name in obj_dir_names:
        src_dir = os.path.join(src_path, obj_name)
        if dst_path.startswith(src_dir):
            error_msg = _(u'Can not copy directory %(src)s to its subdirectory %(des)s') \
                % {'src': src_dir, 'des': dst_path}
            result['error'] = error_msg
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    success = []
    failed = []
    url = None
    for obj_name in obj_file_names + obj_dir_names:
        new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)
        try:
            res = seafile_api.copy_file(src_repo_id, src_path, obj_name,
                                  dst_repo_id, dst_path, new_obj_name, username, need_progress=1)
        except SearpcError, e:
            res = None

        if not res:
            failed.append(obj_name)
        else:
            success.append(obj_name)

    if len(success) > 0:
        url = reverse('repo', args=[dst_repo_id]) + '?p=' + urlquote(dst_path)

    result = {'success': success, 'failed': failed, 'url': url}
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
def get_cp_progress(request):
    '''
        Fetch progress of file/dir mv/cp.
    '''
    content_type = 'application/json; charset=utf-8'
    result = {}

    task_id = request.GET.get('task_id')
    if not task_id:
        result['error'] = _(u'Argument missing')
        return HttpResponse(json.dumps(result), status=400,
                    content_type=content_type)

    res = seafile_api.get_copy_task(task_id)

    # res can be None
    if not res:
        result['error'] = _(u'Error')
        return HttpResponse(json.dumps(result), status=500, content_type=content_type)

    result['done'] = res.done
    result['total'] = res.total
    result['canceled'] = res.canceled
    result['failed'] = res.failed
    result['successful'] = res.successful

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
def cancel_cp(request):
    '''
        cancel file/dir mv/cp.
    '''
    content_type = 'application/json; charset=utf-8'
    result = {}

    task_id = request.GET.get('task_id')
    if not task_id:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400,
                    content_type=content_type)

    res = seafile_api.cancel_copy_task(task_id) # returns 0 or -1

    if res == 0:
        result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        result['error'] = _('Cancel failed')
        return HttpResponse(json.dumps(result), status=400,
                    content_type=content_type)

@login_required_ajax
def repo_star_file(request, repo_id):
    content_type = 'application/json; charset=utf-8'

    user_perm = check_repo_access_permission(repo_id, request.user)
    if user_perm is None:
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    path = request.GET.get('file', '')
    if not path:
        return HttpResponse(json.dumps({'error': _(u'Invalid arguments')}),
                            status=400, content_type=content_type)

    is_dir = False
    star_file(request.user.username, repo_id, path, is_dir)

    return HttpResponse(json.dumps({'success':True}), content_type=content_type)

@login_required_ajax
def repo_unstar_file(request, repo_id):
    content_type = 'application/json; charset=utf-8'

    user_perm = check_repo_access_permission(repo_id, request.user)
    if user_perm is None:
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    path = request.GET.get('file', '')
    if not path:
        return HttpResponse(json.dumps({'error': _(u'Invalid arguments')}),
                            status=400, content_type=content_type)

    unstar_file(request.user.username, repo_id, path)

    return HttpResponse(json.dumps({'success':True}), content_type=content_type)

########## contacts related
@login_required_ajax
def get_contacts(request):
    content_type = 'application/json; charset=utf-8'

    username = request.user.username
    contacts = Contact.objects.get_contacts_by_user(username)
    contact_list = []
    from seahub.avatar.templatetags.avatar_tags import avatar
    for c in contacts:
        try:
            user = User.objects.get(email=c.contact_email)
            if user.is_active:
                contact_list.append({"email": c.contact_email, "avatar": avatar(c.contact_email, 16)})
        except User.DoesNotExist:
            continue

    return HttpResponse(json.dumps({"contacts":contact_list}), content_type=content_type)

@login_required_ajax
def get_current_commit(request, repo_id):
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)

    username = request.user.username
    user_perm = check_repo_access_permission(repo.id, request.user)
    if user_perm is None:
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False

    if repo.encrypted and \
            (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
            and not seafile_api.is_password_set(repo.id, username):
        err_msg = _(u'Library is encrypted.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    head_commit = get_commit(repo.id, repo.version, repo.head_cmmt_id)
    if not head_commit:
        err_msg = _(u'Error: no head commit id')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=500, content_type=content_type)

    if new_merge_with_no_conflict(head_commit):
        info_commit = get_commit_before_new_merge(head_commit)
    else:
        info_commit = head_commit

    ctx = {
        'repo': repo,
        'info_commit': info_commit
    }
    html = render_to_string('snippets/current_commit.html', ctx,
                            context_instance=RequestContext(request))
    return HttpResponse(json.dumps({'html': html}),
                        content_type=content_type)

@login_required_ajax
def sub_repo(request, repo_id):
    '''
    check if a dir has a corresponding sub_repo
    if it does not have, create one
    '''
    content_type = 'application/json; charset=utf-8'
    result = {}

    path = request.GET.get('p')
    if not path:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)
    name = os.path.basename(path)

    username = request.user.username

    # check if the sub-lib exist
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

    if sub_repo:
        result['sub_repo_id'] = sub_repo.id
    else:
        # create a sub-lib
        try:
            # use name as 'repo_name' & 'repo_desc' for sub_repo
            if is_org_context(request):
                org_id = request.user.org.org_id
                sub_repo_id = seaserv.seafserv_threaded_rpc.create_org_virtual_repo(
                    org_id, repo_id, path, name, name, username)
            else:
                sub_repo_id = seafile_api.create_virtual_repo(repo_id, path,
                                                              name, name,
                                                              username)
            result['sub_repo_id'] = sub_repo_id
        except SearpcError, e:
            result['error'] = e.msg
            return HttpResponse(json.dumps(result), status=500, content_type=content_type)

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
def download_enc_file(request, repo_id, file_id):
    content_type = 'application/json; charset=utf-8'
    result = {}

    op = 'downloadblks'
    blklist = []

    if file_id == EMPTY_SHA1:
        result = { 'blklist':blklist, 'url':None, }
        return HttpResponse(json.dumps(result), content_type=content_type)

    try:
        blks = seafile_api.list_file_by_file_id(repo_id, file_id)
    except SearpcError, e:
        result['error'] = _(u'Failed to get file block list')
        return HttpResponse(json.dumps(result), content_type=content_type)

    blklist = blks.split('\n')
    blklist = [i for i in blklist if len(i) == 40]
    token = seafserv_rpc.web_get_access_token(repo_id, file_id,
                                              op, request.user.username)
    url = gen_block_get_url(token, None)
    result = {
        'blklist':blklist,
        'url':url,
        }
    return HttpResponse(json.dumps(result), content_type=content_type)

def upload_file_done(request):
    """Send a message when a file is uploaded.

    Arguments:
    - `request`:
    """
    ct = 'application/json; charset=utf-8'
    result = {}

    filename = request.GET.get('fn', '')
    if not filename:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)
    repo_id = request.GET.get('repo_id', '')
    if not repo_id:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)
    path = request.GET.get('p', '')
    if not path:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)

    # a few checkings
    if not seafile_api.get_repo(repo_id):
        result['error'] = _('Wrong repo id')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)

    owner = seafile_api.get_repo_owner(repo_id)
    if not owner:               # this is an org repo, get org repo owner
        owner = seafile_api.get_org_repo_owner(repo_id)

    file_path = path.rstrip('/') + '/' + filename
    if seafile_api.get_file_id_by_path(repo_id, file_path) is None:
        result['error'] = _('File does not exist')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)

    # send singal
    upload_file_successful.send(sender=None,
                                repo_id=repo_id,
                                file_path=file_path,
                                owner=owner)

    return HttpResponse(json.dumps({'success': True}), content_type=ct)

@login_required_ajax
def unseen_notices_count(request):
    """Count user's unseen notices.

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    count = UserNotification.objects.count_unseen_user_notifications(username)
    result = {}
    result['count'] = count
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
def get_popup_notices(request):
    """Get user's notifications.

    If unseen notices > 5, return all unseen notices.
    If unseen notices = 0, return last 5 notices.
    Otherwise return all unseen notices, plus some seen notices to make the
    sum equal to 5.

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    result_notices = []
    unseen_notices = []
    seen_notices = []

    list_num = 5
    unseen_num = UserNotification.objects.count_unseen_user_notifications(username)
    if unseen_num == 0:
        seen_notices = UserNotification.objects.get_user_notifications(
            username)[:list_num]
    elif unseen_num > list_num:
        unseen_notices = UserNotification.objects.get_user_notifications(
            username, seen=False)
    else:
        unseen_notices = UserNotification.objects.get_user_notifications(
            username, seen=False)
        seen_notices = UserNotification.objects.get_user_notifications(
            username, seen=True)[:list_num - unseen_num]

    result_notices += unseen_notices
    result_notices += seen_notices

    # Add 'msg_from' or 'default_avatar_url' to notice.
    result_notices = add_notice_from_info(result_notices)

    ctx_notices = {"notices": result_notices}
    notice_html = render_to_string(
            'snippets/notice_html.html', ctx_notices,
            context_instance=RequestContext(request))

    return HttpResponse(json.dumps({
                "notice_html": notice_html,
                }), content_type=content_type)

@login_required_ajax
def set_notices_seen(request):
    """Set user's notices seen:

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    unseen_notices = UserNotification.objects.get_user_notifications(username,
                                                                     seen=False)
    for notice in unseen_notices:
        notice.seen = True
        notice.save()

        # mark related user msg as read
        if notice.is_user_message():
            d = notice.user_message_detail_to_dict()
            msg_from = d.get('msg_from')
            UserMessage.objects.update_unread_messages(msg_from, username)

    return HttpResponse(json.dumps({'success': True}), content_type=content_type)

@login_required_ajax
def set_notice_seen_by_id(request):
    """

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'
    notice_id = request.GET.get('notice_id')

    notice = UserNotification.objects.get(id=notice_id)
    if not notice.seen:
        notice.seen = True
        notice.save()

    return HttpResponse(json.dumps({'success': True}), content_type=content_type)

@login_required_ajax
def repo_remove(request, repo_id):
    ct = 'application/json; charset=utf-8'
    result = {}

    if get_system_default_repo_id() == repo_id:
        result['error'] = _(u'System library can not be deleted.')
        return HttpResponse(json.dumps(result), status=403, content_type=ct)

    repo = get_repo(repo_id)
    username = request.user.username
    if is_org_context(request):
        # Remove repo in org context, only (sys admin/repo owner/org staff) can
        # perform this operation.
        org_id = request.user.org.org_id
        is_org_staff = request.user.org.is_staff
        org_repo_owner = seafile_api.get_org_repo_owner(repo_id)
        if request.user.is_staff or is_org_staff or org_repo_owner == username:
            # Must get related useres before remove the repo
            usernames = get_related_users_by_org_repo(org_id, repo_id)
            seafile_api.remove_repo(repo_id)
            if repo:            # send delete signal only repo is valid
                repo_deleted.send(sender=None,
                                  org_id=org_id,
                                  usernames=usernames,
                                  repo_owner=username,
                                  repo_id=repo_id,
                                  repo_name=repo.name)
            result['success'] = True
            return HttpResponse(json.dumps(result), content_type=ct)
        else:
            result['error'] = _(u'Permission denied.')
            return HttpResponse(json.dumps(result), status=403, content_type=ct)
    else:
        # Remove repo in personal context, only (repo owner/sys admin) can
        # perform this operation.
        if validate_owner(request, repo_id) or request.user.is_staff:
            usernames = get_related_users_by_repo(repo_id)
            seafile_api.remove_repo(repo_id)
            if repo:            # send delete signal only repo is valid
                repo_deleted.send(sender=None,
                                  org_id=-1,
                                  usernames=usernames,
                                  repo_owner=username,
                                  repo_id=repo_id,
                                  repo_name=repo.name)
            result['success'] = True
            return HttpResponse(json.dumps(result), content_type=ct)
        else:
            result['error'] = _(u'Permission denied.')
            return HttpResponse(json.dumps(result), status=403, content_type=ct)

@login_required_ajax
def space_and_traffic(request):
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    # space & quota calculation
    org = ccnet_threaded_rpc.get_orgs_by_user(username)
    if not org:
        space_quota = seafile_api.get_user_quota(username)
        space_usage = seafile_api.get_user_self_usage(username)
        if CALC_SHARE_USAGE:
            share_quota = seafile_api.get_user_share_quota(username)
            share_usage = seafile_api.get_user_share_usage(username)
        else:
            share_quota = 0
            share_usage = 0
    else:
        org_id = org[0].org_id
        space_quota = seafserv_threaded_rpc.get_org_user_quota(org_id,
                                                               username)
        space_usage = seafserv_threaded_rpc.get_org_user_quota_usage(
            org_id, username)
        share_quota = 0         # no share quota/usage for org account
        share_usage = 0

    rates = {}
    rates['space_quota'] = space_quota
    rates['share_quota'] = share_quota
    total_quota = space_quota + share_quota
    if space_quota > 0:
        rates['space_usage'] = str(float(space_usage) / total_quota * 100) + '%'
    else:                       # no space quota set in config
        rates['space_usage'] = '0%'

    if share_quota > 0:
        rates['share_usage'] = str(float(share_usage) / total_quota * 100) + '%'
    else:                       # no share quota set in config
        rates['share_usage'] = '0%'

    # traffic calculation
    traffic_stat = 0
    if TRAFFIC_STATS_ENABLED:
        # User's network traffic stat in this month
        try:
            stat = get_user_traffic_stat(username)
        except Exception as e:
            logger.error(e)
            stat = None

        if stat:
            traffic_stat = stat['file_view'] + stat['file_download'] + stat['dir_download']

    # payment url, TODO: need to remove from here.
    payment_url = ''
    ENABLE_PAYMENT = getattr(settings, 'ENABLE_PAYMENT', False)
    if ENABLE_PAYMENT:
        if is_org_context(request):
            if request.user.org and bool(request.user.org.is_staff) is True:
                # payment for org admin
                payment_url = reverse('org_plan')
            else:
                # no payment for org members
                ENABLE_PAYMENT = False
        else:
            # payment for personal account
            payment_url = reverse('plan')

    ctx = {
        "org": org,
        "space_quota": space_quota,
        "space_usage": space_usage,
        "share_quota": share_quota,
        "share_usage": share_usage,
        "CALC_SHARE_USAGE": CALC_SHARE_USAGE,
        "show_quota_help": not CALC_SHARE_USAGE,
        "rates": rates,
        "TRAFFIC_STATS_ENABLED": TRAFFIC_STATS_ENABLED,
        "traffic_stat": traffic_stat,
        "ENABLE_PAYMENT": ENABLE_PAYMENT,
        "payment_url": payment_url,
    }

    html = render_to_string('snippets/space_and_traffic.html', ctx,
                            context_instance=RequestContext(request))
    return HttpResponse(json.dumps({"html": html}), content_type=content_type)

def get_share_in_repo_list(request, start, limit):
    """List share in repos.
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        repo_list = seafile_api.get_org_share_in_repo_list(org_id, username,
                                                           -1, -1)
    else:
        repo_list = seafile_api.get_share_in_repo_list(username, -1, -1)

    for repo in repo_list:
        repo.user_perm = seafile_api.check_repo_access_permission(repo.repo_id,
                                                                  username)
    return repo_list

def get_groups_by_user(request):
    """List user groups.
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        return seaserv.get_org_groups_by_user(org_id, username)
    else:
        return seaserv.get_personal_groups_by_user(username)

def get_group_repos(request, groups):
    """Get repos shared to groups.
    """
    username = request.user.username
    group_repos = []
    if is_org_context(request):
        org_id = request.user.org.org_id
        # For each group I joined...
        for grp in groups:
            # Get group repos, and for each group repos...
            for r_id in seafile_api.get_org_group_repoids(org_id, grp.id):
                # No need to list my own repo
                repo_owner = seafile_api.get_org_repo_owner(r_id)
                if repo_owner == username:
                    continue
                # Convert repo properties due to the different collumns in Repo
                # and SharedRepo
                r = get_repo(r_id)
                if not r:
                    continue
                r.repo_id = r.id
                r.repo_name = r.name
                r.repo_desc = r.desc
                r.last_modified = get_repo_last_modify(r)
                r.share_type = 'group'
                r.user = repo_owner
                r.user_perm = seafile_api.check_repo_access_permission(
                    r_id, username)
                r.group = grp
                group_repos.append(r)
    else:
        # For each group I joined...
        for grp in groups:
            # Get group repos, and for each group repos...
            for r_id in seafile_api.get_group_repoids(grp.id):
                # No need to list my own repo
                repo_owner = seafile_api.get_repo_owner(r_id)
                if repo_owner == username:
                    continue
                # Convert repo properties due to the different collumns in Repo
                # and SharedRepo
                r = get_repo(r_id)
                if not r:
                    continue
                r.repo_id = r.id
                r.repo_name = r.name
                r.repo_desc = r.desc
                r.last_modified = get_repo_last_modify(r)
                r.share_type = 'group'
                r.user = repo_owner
                r.user_perm = seafile_api.check_repo_access_permission(
                    r_id, username)
                r.group = grp
                group_repos.append(r)
    return group_repos

@login_required_ajax
def my_shared_and_group_repos(request):
    """Return html snippet of repos that shared to user and group repos.

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'

    # shared
    shared_repos = get_share_in_repo_list(request, -1, -1)
    shared_repos.sort(lambda x, y: cmp(y.last_modified, x.last_modified))

    # group repos
    joined_groups = get_groups_by_user(request)
    group_repos = get_group_repos(request, joined_groups)
    group_repos.sort(key=lambda x: x.group.group_name)
    for i, repo in enumerate(group_repos):
        if i == 0:
            repo.show_group_name = True
        else:
            if repo.group.group_name != group_repos[i-1].group.group_name:
                repo.show_group_name = True

    ctx_shared = {"shared_repos": shared_repos}
    ctx_group = {"group_repos": group_repos}
    shared_repos_html = render_to_string(
        'snippets/my_shared_repos.html', ctx_shared,
        context_instance=RequestContext(request))
    group_repos_html = render_to_string(
        'snippets/my_group_repos.html', ctx_group,
        context_instance=RequestContext(request))

    return_shared_repos = True if shared_repos else False

    ret = {
        "shared": {
            "html": shared_repos_html,
            "return_shared_repos": return_shared_repos
        },
        "group": group_repos_html
    }
    return HttpResponse(json.dumps(ret), content_type=content_type)

@login_required_ajax
def get_file_op_url(request, repo_id):
    """Get file upload/update url for AJAX.
    """
    content_type = 'application/json; charset=utf-8'

    op_type = request.GET.get('op_type') # value can be 'upload', 'update', 'upload-blks', 'update-blks'
    if not op_type:
        err_msg = _(u'Argument missing')
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    username = request.user.username
    url = ''
    if check_repo_access_permission(repo_id, request.user) == 'rw':
        token = seafile_api.get_fileserver_access_token(repo_id, 'dummy',
                                                        op_type, username)
        url = gen_file_upload_url(token, op_type + '-aj')

    return HttpResponse(json.dumps({"url": url}), content_type=content_type)

def get_file_upload_url_ul(request, token):
    """Get file upload url in dir upload link.

    Arguments:
    - `request`:
    - `token`:
    """
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    uls = UploadLinkShare.objects.get_valid_upload_link_by_token(token)
    if uls is None:
        return HttpResponse(json.dumps({"error": _("Bad upload link token.")}),
                            status=400, content_type=content_type)

    repo_id = uls.repo_id
    r = request.GET.get('r', '')
    if repo_id != r:            # perm check
        return HttpResponse(json.dumps({"error": _("Bad repo id in upload link.")}),
                            status=403, content_type=content_type)

    acc_token = seafile_api.get_fileserver_access_token(repo_id, 'dummy',
                                                        'upload',
                                                        request.user.username)
    url = gen_file_upload_url(acc_token, 'upload-aj')
    return HttpResponse(json.dumps({"url": url}), content_type=content_type)

@login_required_ajax
def repo_history_changes(request, repo_id):
    changes = {}
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        return HttpResponse(json.dumps(changes), content_type=content_type)

    # perm check
    if check_repo_access_permission(repo.id, request.user) is None:
        return HttpResponse(json.dumps(changes), content_type=content_type)

    username = request.user.username
    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False

    if repo.encrypted and \
            (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
            and not is_passwd_set(repo_id, username):
        return HttpResponse(json.dumps(changes), content_type=content_type)

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return HttpResponse(json.dumps(changes), content_type=content_type)

    changes = get_diff(repo_id, '', commit_id)

    c = get_commit(repo.id, repo.version, commit_id)
    if c.parent_id is None:
        # A commit is a first commit only if it's parent id is None.
        changes['cmt_desc'] = repo.desc
    elif c.second_parent_id is None:
        # Normal commit only has one parent.
        if c.desc.startswith('Changed library'):
            changes['cmt_desc'] = _('Changed library name or description')
    else:
        # A commit is a merge only if it has two parents.
        changes['cmt_desc'] = _('No conflict in the merge.')

    return HttpResponse(json.dumps(changes), content_type=content_type)

def _create_repo_common(request, repo_name, repo_desc, encryption,
                        uuid, magic_str, encrypted_file_key):
    """Common logic for creating repo.

    Returns:
        newly created repo id. Or ``None`` if error raised.
    """
    username = request.user.username
    try:
        if not encryption:
            if is_org_context(request):
                org_id = request.user.org.org_id
                repo_id = seafile_api.create_org_repo(repo_name, repo_desc,
                                                      username, None, org_id)
            else:
                repo_id = seafile_api.create_repo(repo_name, repo_desc,
                                                  username, None)
        else:
            if is_org_context(request):
                org_id = request.user.org.org_id
                repo_id = seafile_api.create_org_enc_repo(
                    uuid, repo_name, repo_desc, username, magic_str,
                    encrypted_file_key, enc_version=2, org_id=org_id)
            else:
                repo_id = seafile_api.create_enc_repo(
                    uuid, repo_name, repo_desc, username,
                    magic_str, encrypted_file_key, enc_version=2)
    except SearpcError as e:
        logger.error(e)
        repo_id = None

    return repo_id

@login_required_ajax
def repo_create(request):
    '''
    Handle ajax post to create a library.

    '''
    if request.method != 'POST':
        return Http404

    result = {}
    content_type = 'application/json; charset=utf-8'

    if not request.user.permissions.can_add_repo():
        result['error'] = _(u"You do not have permission to create library")
        return HttpResponse(json.dumps(result), status=403,
                            content_type=content_type)

    form = RepoCreateForm(request.POST)
    if not form.is_valid():
        result['error'] = str(form.errors.values()[0])
        return HttpResponseBadRequest(json.dumps(result),
                                      content_type=content_type)

    repo_name = form.cleaned_data['repo_name']
    repo_desc = form.cleaned_data['repo_desc']
    encryption = int(form.cleaned_data['encryption'])

    uuid = form.cleaned_data['uuid']
    magic_str = form.cleaned_data['magic_str']
    encrypted_file_key = form.cleaned_data['encrypted_file_key']

    repo_id = _create_repo_common(request, repo_name, repo_desc, encryption,
                                  uuid, magic_str, encrypted_file_key)
    if repo_id is None:
        result['error'] = _(u"Internal Server Error")
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)

    username = request.user.username
    try:
        default_lib = (int(request.GET.get('default_lib', 0)) == 1)
    except ValueError:
        default_lib = False
    if default_lib:
        UserOptions.objects.set_default_repo(username, repo_id)

    if is_org_context(request):
        org_id = request.user.org.org_id
    else:
        org_id = -1
    repo_created.send(sender=None,
                      org_id=org_id,
                      creator=username,
                      repo_id=repo_id,
                      repo_name=repo_name)
    result = {
        'repo_id': repo_id,
        'repo_name': repo_name,
        'repo_desc': repo_desc,
        'repo_enc': encryption,
    }
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
def public_repo_create(request):
    '''
    Handle ajax post to create public repo.

    '''
    if request.method != 'POST':
        return Http404

    result = {}
    content_type = 'application/json; charset=utf-8'

    if not request.user.permissions.can_add_repo():
        result['error'] = _(u"You do not have permission to create library")
        return HttpResponse(json.dumps(result), status=403,
                            content_type=content_type)

    form = SharedRepoCreateForm(request.POST)
    if not form.is_valid():
        result['error'] = str(form.errors.values()[0])
        return HttpResponseBadRequest(json.dumps(result),
                                      content_type=content_type)

    repo_name = form.cleaned_data['repo_name']
    repo_desc = form.cleaned_data['repo_desc']
    permission = form.cleaned_data['permission']
    encryption = int(form.cleaned_data['encryption'])

    uuid = form.cleaned_data['uuid']
    magic_str = form.cleaned_data['magic_str']
    encrypted_file_key = form.cleaned_data['encrypted_file_key']

    repo_id = _create_repo_common(request, repo_name, repo_desc, encryption,
                                  uuid, magic_str, encrypted_file_key)
    if repo_id is None:
        result['error'] = _(u'Internal Server Error')
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)

    org_id = -1
    if is_org_context(request):
        org_id = request.user.org.org_id
        seaserv.seafserv_threaded_rpc.set_org_inner_pub_repo(
            org_id, repo_id, permission)
    else:
        seafile_api.add_inner_pub_repo(repo_id, permission)

    username = request.user.username
    repo_created.send(sender=None,
                      org_id=org_id,
                      creator=username,
                      repo_id=repo_id,
                      repo_name=repo_name)

    result['success'] = True
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
def events(request):
    events_count = 15
    username = request.user.username
    start = int(request.GET.get('start'))

    if is_org_context(request):
        org_id = request.user.org.org_id
        events, start = get_org_user_events(org_id, username, start, events_count)
    else:
        events, start = get_user_events(username, start, events_count)

    events_more = True if len(events) == events_count else False

    event_groups = group_events_data(events)
    ctx = {'event_groups': event_groups}
    html = render_to_string("snippets/events_body.html", ctx)

    return HttpResponse(json.dumps({'html': html,
                                    'events_more': events_more,
                                    'new_start': start}),
                        content_type='application/json; charset=utf-8')

@login_required_ajax
def get_groups(request):
    content_type = 'application/json; charset=utf-8'

    groups = request.user.joined_groups
    group_list = []
    from seahub.avatar.templatetags.group_avatar_tags import grp_avatar
    for g in groups:
        group_list.append({"name": g.group_name, "id": g.id, "avatar": grp_avatar(g.id, 16)})

    return HttpResponse(json.dumps({"groups":group_list}), content_type=content_type)

