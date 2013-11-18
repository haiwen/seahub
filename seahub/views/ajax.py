# -*- coding: utf-8 -*-
import os
import stat
import logging
import simplejson as json

from django.core.urlresolvers import reverse
from django.http import HttpResponse, Http404
from django.template import RequestContext
from django.template.loader import render_to_string
from django.utils.http import urlquote
from django.utils.translation import ugettext as _

import seaserv
from seaserv import seafile_api, seafserv_rpc
from pysearpc import SearpcError

from seahub.auth.decorators import login_required
from seahub.contacts.models import Contact
from seahub.forms import RepoNewDirentForm, RepoRenameDirentForm
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.signals import upload_file_successful
from seahub.views import get_repo_dirents
from seahub.views.repo import get_nav_path, get_fileshare, get_dir_share_link, \
        get_uploadlink, get_dir_shared_upload_link
import seahub.settings as settings
from seahub.utils import check_filename_with_rename, EMPTY_SHA1, gen_block_get_url
from seahub.utils.star import star_file, unstar_file

# Get an instance of a logger
logger = logging.getLogger(__name__)

########## Seafile API Wrapper
def get_repo(repo_id):
    return seafile_api.get_repo(repo_id)

def get_commit(commit_id):
    return seaserv.get_commit(commit_id)

def check_repo_access_permission(repo_id, username):
    return seafile_api.check_repo_access_permission(repo_id, username)

def get_group(gid):
    return seaserv.get_group(gid)

def is_group_user(gid, username):
    return seaserv.is_group_user(gid, username)
    
########## repo related
@login_required
def get_dirents(request, repo_id):
    """
    Get dirents in a dir for file tree
    """
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    username = request.user.username

    # permission checking
    user_perm = check_repo_access_permission(repo_id, username)
    if user_perm is None:
        err_msg = _(u"You don't have permission to access the library.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    path = request.GET.get('path', '')
    dir_only = request.GET.get('dir_only', False)
    all_dir = request.GET.get('all_dir', False)
    if not path:
        err_msg = _(u"No path.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=400,
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
            all_dirents.append(ds)
        return HttpResponse(json.dumps(all_dirents), content_type=content_type)

    # get dirents in path
    try:
        dirents = seafile_api.list_dir_by_path(repo_id, path.encode('utf-8'))
    except SearpcError, e:
        return HttpResponse(json.dumps({"err_msg": e.msg}), status=500,
                            content_type=content_type)
    dirent_list = []
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
                'repo_id': repo_id,
            }
            dirent_list.append(subdir)
        else:
            if not dir_only:
                f = {
                    'repo_id': repo_id,
                    'id': dirent.obj_id,
                    'name': dirent.obj_name,
                    'type': 'file',
                    }
                dirent_list.append(f)

    return HttpResponse(json.dumps(dirent_list), content_type=content_type)

@login_required
def get_group_repos(request, group_id):
    if not request.is_ajax():
        raise Http404
    
    content_type = 'application/json; charset=utf-8'

    group_id_int = int(group_id) 
    group = get_group(group_id_int)    
    if not group:
        err_msg = _(u"The group doesn't exist") 
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=400,
                            content_type=content_type)

    joined = is_group_user(group_id_int, request.user.username)
    if not joined and not request.user.is_staff:
        err_msg = _(u"Permission denied")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    repos = seafile_api.get_group_repo_list(group_id_int)    
    repo_list = []
    for repo in repos:
        repo_list.append({"name": repo.props.name, "id": repo.props.id})
    
    return HttpResponse(json.dumps(repo_list), content_type=content_type)

@login_required
def get_my_unenc_repos(request):
    """Get my owned and unencrypted repos.
    """
    if not request.is_ajax():
        raise Http404
    
    content_type = 'application/json; charset=utf-8'

    repos = seafile_api.get_owned_repo_list(request.user.username)
    repo_list = []
    for repo in repos:
        if repo.encrypted:
            continue
        repo_list.append({"name": repo.name, "id": repo.id})
    
    return HttpResponse(json.dumps(repo_list), content_type=content_type)

@login_required        
def list_dir(request, repo_id):
    """
    List directory entries in AJAX.
    """
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)

    username = request.user.username
    user_perm = check_repo_access_permission(repo.id, username)
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

    head_commit = get_commit(repo.head_cmmt_id)
    if not head_commit:
        err_msg = _(u'Error: no head commit id')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=500, content_type=content_type)

    path = request.GET.get('p', '/')
    if path[-1] != '/':
        path = path + '/' 

    more_start = None
    file_list, dir_list, dirent_more = get_repo_dirents(request, repo.id, head_commit, path, offset=0, limit=100)
    if dirent_more:
        more_start = 100
    zipped = get_nav_path(path, repo.name)
    fileshare = get_fileshare(repo.id, username, path)
    dir_shared_link = get_dir_share_link(fileshare)
    uploadlink = get_uploadlink(repo.id, username, path)
    dir_shared_upload_link = get_dir_shared_upload_link(uploadlink)

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
    }   
    html = render_to_string('snippets/repo_dir_data.html', ctx,
                            context_instance=RequestContext(request))
    return HttpResponse(json.dumps({'html': html, 'path': path}),
                        content_type=content_type)

@login_required        
def list_dir_more(request, repo_id):
    """
    List 'more' entries in a directory with AJAX.
    """
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)

    username = request.user.username
    user_perm = check_repo_access_permission(repo.id, username)
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

    head_commit = get_commit(repo.head_cmmt_id)
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
    file_list, dir_list, dirent_more = get_repo_dirents(request, repo.id, head_commit, path, offset, limit=100)
    if dirent_more:
        more_start = offset + 100

    ctx = { 
        'repo': repo,
        'user_perm': user_perm,
        'path': path,
        'server_crypto': server_crypto,
        'dir_list': dir_list,
        'file_list': file_list,
        'ENABLE_SUB_LIBRARY': settings.ENABLE_SUB_LIBRARY,
    }   
    html = render_to_string('snippets/repo_dirents.html', ctx,
                            context_instance=RequestContext(request))
    return HttpResponse(json.dumps({'html': html, 'dirent_more': dirent_more, 'more_start': more_start}),
                        content_type=content_type)


def new_dirent_common(func):
    """Decorator for common logic in creating directory and file.
    """
    def _decorated(request, repo_id, *args, **kwargs):
        if request.method != 'POST' or not request.is_ajax():
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
        if check_repo_access_permission(repo.id, username) != 'rw':
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
    
@login_required
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

@login_required
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

@login_required    
def rename_dirent(request, repo_id):
    """
    Rename a file/dir in a repo, with ajax    
    """
    if request.method != 'POST' or not request.is_ajax():
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
    if check_repo_access_permission(repo.id, username) != 'rw':
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

    return HttpResponse(json.dumps({'success': True}),
                        content_type=content_type)

@login_required    
def delete_dirent(request, repo_id):
    """
    Delete a file/dir with ajax.    
    """
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    # permission checking
    username = request.user.username
    if check_repo_access_permission(repo.id, username) != 'rw':
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

@login_required    
def delete_dirents(request, repo_id):
    """
    Delete multi files/dirs with ajax.    
    """
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    # permission checking
    username = request.user.username
    if check_repo_access_permission(repo.id, username) != 'rw':
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
        if request.method != 'POST' or not request.is_ajax():
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
        if check_repo_access_permission(repo.id, username) != 'rw':
            result['error'] = _('Permission denied')
            return HttpResponse(json.dumps(result), status=403,
                                content_type=content_type)


        # arguments validation
        path = request.GET.get('path')
        obj_name = request.GET.get('obj_name')
        dst_repo_id = request.POST.get('dst_repo')
        dst_path = request.POST.get('dst_path')

        if not (path and obj_name and dst_repo_id and  dst_path):
            result['error'] = _('Argument missing')
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)

        # check file path
        if len(dst_path+obj_name) > settings.MAX_PATH:
            result['error'] =  _('Destination path is too long.')
            return HttpResponse(json.dumps(result), status=400,
                                content_type=content_type)
    
        # check whether user has write permission to dest repo
        if check_repo_access_permission(dst_repo_id, username) != 'rw':
            result['error'] = _('Permission denied')
            return HttpResponse(json.dumps(result), status=403,
                                content_type=content_type)

        # do nothing when dst is the same as src
        if repo_id == dst_repo_id and path == dst_path:
            result['error'] = _('Invalid destination path')
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)
        return func(repo_id, path, dst_repo_id, dst_path, obj_name, username)
    return _decorated

@login_required
@copy_move_common
def mv_file(src_repo_id, src_path, dst_repo_id, dst_path, obj_name, username):
    result = {}
    content_type = 'application/json; charset=utf-8'
    
    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    try:
        msg_url = reverse('repo', args=[dst_repo_id]) + '?p=' + urlquote(dst_path)
        seafile_api.move_file(src_repo_id, src_path, obj_name,
                              dst_repo_id, dst_path, new_obj_name, username)
        msg = _(u'Successfully moved %(name)s <a href="%(url)s">view</a>') % \
            {"name":obj_name, "url":msg_url}
        result['msg'] = msg
        result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    except SearpcError, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)

@login_required
@copy_move_common
def cp_file(src_repo_id, src_path, dst_repo_id, dst_path, obj_name, username):
    result = {}
    content_type = 'application/json; charset=utf-8'
    
    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    try:
        msg_url = reverse('repo', args=[dst_repo_id]) + '?p=' + urlquote(dst_path)
        seafile_api.copy_file(src_repo_id, src_path, obj_name,
                              dst_repo_id, dst_path, new_obj_name, username)
        msg = _(u'Successfully copied %(name)s <a href="%(url)s">view</a>') % \
            {"name":obj_name, "url":msg_url}
        result['msg'] = msg
        result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    except SearpcError, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)

@login_required
@copy_move_common
def mv_dir(src_repo_id, src_path, dst_repo_id, dst_path, obj_name, username):
    result = {}
    content_type = 'application/json; charset=utf-8'
    
    src_dir = os.path.join(src_path, obj_name)
    if dst_path.startswith(src_dir):
        error_msg = _(u'Can not move directory %(src)s to its subdirectory %(des)s') \
            % {'src': src_dir, 'des': dst_path}
        result['error'] = error_msg
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    
    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    try:
        msg_url = reverse('repo', args=[dst_repo_id]) + '?p=' + urlquote(dst_path)
        seafile_api.move_file(src_repo_id, src_path, obj_name,
                              dst_repo_id, dst_path, new_obj_name, username)
        msg = _(u'Successfully moved %(name)s <a href="%(url)s">view</a>') % \
            {"name":obj_name, "url":msg_url}
        result['msg'] = msg
        result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    except SearpcError, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)
    
@login_required
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
        msg_url = reverse('repo', args=[dst_repo_id]) + '?p=' + urlquote(dst_path)
        seafile_api.copy_file(src_repo_id, src_path, obj_name,
                              dst_repo_id, dst_path, new_obj_name, username)
        msg = _(u'Successfully copied %(name)s <a href="%(url)s">view</a>') % \
            {"name":obj_name, "url":msg_url}
        result['msg'] = msg
        result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    except SearpcError, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)


def dirents_copy_move_common(func):
    """
    Decorator for common logic in copying/moving dirs/files.
    """
    def _decorated(request, repo_id, *args, **kwargs):

        if request.method != 'POST' or not request.is_ajax():
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
        if check_repo_access_permission(repo.id, username) != 'rw':
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
        if check_repo_access_permission(dst_repo_id, username) != 'rw':
            result['error'] = _('Permission denied')
            return HttpResponse(json.dumps(result), status=403,
                                content_type=content_type)

        # when dst is the same as src
        if repo_id == dst_repo_id and parent_dir == dst_path:
            result['error'] = _('Invalid destination path')
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)

        return func(repo_id, parent_dir, dst_repo_id, dst_path, obj_file_names, obj_dir_names, username)
    return _decorated

@login_required
@dirents_copy_move_common
def mv_dirents(src_repo_id, src_path, dst_repo_id, dst_path, obj_file_names, obj_dir_names, username):
    result = {}
    content_type = 'application/json; charset=utf-8'

    for obj_name in obj_dir_names:
        src_dir = os.path.join(src_path, obj_name)
        if dst_path.startswith(src_dir):
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
            seafile_api.move_file(src_repo_id, src_path, obj_name,
                                  dst_repo_id, dst_path, new_obj_name, username)
            success.append(obj_name)
        except SearpcError, e:
            failed.append(obj_name)

    if len(success) > 0:   
        url = reverse('repo', args=[dst_repo_id]) + '?p=' + urlquote(dst_path)
    return HttpResponse(json.dumps({'success': success, 'failed': failed, 'url': url}), content_type=content_type)

@login_required
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
            seafile_api.copy_file(src_repo_id, src_path, obj_name,
                                  dst_repo_id, dst_path, new_obj_name, username)
            success.append(obj_name)
        except SearpcError, e:
            failed.append(obj_name)

    if len(success) > 0:   
        url = reverse('repo', args=[dst_repo_id]) + '?p=' + urlquote(dst_path)
    return HttpResponse(json.dumps({'success': success, 'failed': failed, 'url': url}), content_type=content_type)

@login_required
def repo_star_file(request, repo_id):
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    path = request.GET.get('file', '')
    if not path:
        return HttpResponse(json.dumps({'error': _(u'Invalid arguments')}),
                            status=400, content_type=content_type)

    is_dir = False
    star_file(request.user.username, repo_id, path, is_dir)

    return HttpResponse(json.dumps({'success':True}), content_type=content_type)

@login_required
def repo_unstar_file(request, repo_id):
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    path = request.GET.get('file', '')
    if not path:
        return HttpResponse(json.dumps({'error': _(u'Invalid arguments')}),
                            status=400, content_type=content_type)

    unstar_file(request.user.username, repo_id, path)

    return HttpResponse(json.dumps({'success':True}), content_type=content_type)

########## contacts related
@login_required
def get_contacts(request):
    if not request.is_ajax():
        raise Http404
    
    content_type = 'application/json; charset=utf-8'

    username = request.user.username
    contacts = Contact.objects.get_contacts_by_user(username)
    contact_list = [] 
    from seahub.avatar.templatetags.avatar_tags import avatar
    for c in contacts:
        contact_list.append({"email": c.contact_email, "avatar": avatar(c.contact_email, 16)})
    
    return HttpResponse(json.dumps({"contacts":contact_list}), content_type=content_type)

@login_required
def get_current_commit(request, repo_id):
    if not request.is_ajax():
        raise Http404
    
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)

    username = request.user.username
    user_perm = check_repo_access_permission(repo.id, username)
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

    head_commit = get_commit(repo.head_cmmt_id)
    if not head_commit:
        err_msg = _(u'Error: no head commit id')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=500, content_type=content_type)

    ctx = { 
        'repo': repo,
        'current_commit': head_commit
    }   
    html = render_to_string('snippets/current_commit.html', ctx,
                            context_instance=RequestContext(request))
    return HttpResponse(json.dumps({'html': html}),
                        content_type=content_type)

@login_required
def sub_repo(request, repo_id): 
    '''
    check if a dir has a corresponding sub_repo
    if it does not have, create one
    '''
    if not request.is_ajax():
        raise Http404
    
    content_type = 'application/json; charset=utf-8'
    result = {}

    path = request.GET.get('p') 
    name = request.GET.get('name')
    if not (path and name):
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    username = request.user.username

    # check if the sub-lib exist
    try:
        sub_repo = seafile_api.get_virtual_repo(repo_id, path, username)
    except SearpcError, e:
        result['error'] = e.msg
        return HttpResponse(json.dumps(result), status=500, content_type=content_type)
    
    if sub_repo:
        result['sub_repo_id'] = sub_repo.id
    else:
        # create a sub-lib
        try:
            # use name as 'repo_name' & 'repo_desc' for sub_repo
            sub_repo_id = seafile_api.create_virtual_repo(repo_id, path, name, name, username)
            result['sub_repo_id'] = sub_repo_id
        except SearpcError, e:
            result['error'] = e.msg
            return HttpResponse(json.dumps(result), status=500, content_type=content_type)

    return HttpResponse(json.dumps(result), content_type=content_type)

def download_enc_file(request, repo_id, file_id):
    if not request.is_ajax(): 
        raise Http404

    content_type = 'application/json; charset=utf-8'
    result = {}  

    op = 'downloadblks'
    blklist = [] 

    if file_id == EMPTY_SHA1:
        result = { 'blklist':blklist, 'url':None, }    
        return HttpResponse(json.dumps(result), content_type=content_type)

    try: 
        blks = seafile_api.list_file_by_file_id(file_id)
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
    if not owner:
        result['error'] = _('Wrong repo id')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)

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
    
