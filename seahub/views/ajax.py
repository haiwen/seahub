# -*- coding: utf-8 -*-
import os
import stat
import logging
import simplejson as json

from django.core.urlresolvers import reverse
from django.http import HttpResponse, Http404, HttpResponseRedirect
from django.template import RequestContext
from django.template.loader import render_to_string
from django.utils.http import urlquote
from django.utils.translation import ugettext as _

import seaserv
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.auth.decorators import login_required
from seahub.contacts.models import Contact
from seahub.forms import RepoNewDirentForm, RepoRenameDirentForm
from seahub.views import get_repo_dirents
from seahub.views.repo import get_nav_path, get_fileshare, get_dir_share_link
import seahub.settings as settings
from seahub.signals import repo_created
from seahub.utils import check_filename_with_rename, star_file, unstar_file

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
    if not path:
        err_msg = _(u"No path.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=400,
                            content_type=content_type)

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
def get_my_repos(request):
    if not request.is_ajax():
        raise Http404
    
    content_type = 'application/json; charset=utf-8'

    repos = seafile_api.get_owned_repo_list(request.user.username)
    repo_list = []
    for repo in repos:
        repo_list.append({"name": repo.props.name, "id": repo.props.id})
    
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

    if repo.encrypted and not seafile_api.is_password_set(repo.id, username):
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

    file_list, dir_list = get_repo_dirents(request, repo.id, head_commit, path)
    zipped = get_nav_path(path, repo.name)
    fileshare = get_fileshare(repo.id, username, path)
    dir_shared_link = get_dir_share_link(fileshare)

    ctx = { 
        'repo': repo,
        'zipped': zipped,
        'user_perm': user_perm,
        'path': path,
        'fileshare': fileshare,
        'dir_shared_link': dir_shared_link,
        'dir_list': dir_list,
        'file_list': file_list,
        'ENABLE_SUB_LIBRARY': settings.ENABLE_SUB_LIBRARY,
    }   
    html = render_to_string('snippets/repo_dir_data.html', ctx,
                            context_instance=RequestContext(request))
    return HttpResponse(json.dumps({'html': html, 'path': path}),
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
            url = reverse('repo', args=[repo_id]) + ('?p=%s' % urlquote(path))
            return HttpResponseRedirect(url)
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

    if repo.encrypted and not seafile_api.is_password_set(repo.id, username):
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
def check_sub_repo(request, repo_id): 
    '''
    check if a dir has a corresponding sub_repo
    '''
    if not request.is_ajax():
        raise Http404
    
    content_type = 'application/json; charset=utf-8'
    result = {}

    path = request.GET.get('p') 
    if not path:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    try:
        sub_repo = seafile_api.get_virtual_repo(repo_id, path, request.user.username)
    except SearpcError, e:
        result['error'] = e.msg
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)
    
    if sub_repo:
        result['exist'] = True
        result['sub_repo_id'] = sub_repo.id
    else:
        result['exist'] = False

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required
def create_sub_repo(request, repo_id):
    if not request.is_ajax() or request.method != 'POST':
        return Http404

    result = {}
    content_type = 'application/json; charset=utf-8'

    orig_repo_id = repo_id
    orig_path = request.POST.get('orig_path', '')
    repo_name = request.POST.get('repo_name', '')
    repo_desc = request.POST.get('repo_desc', '')
    owner = request.user.username

    if not orig_path or not repo_name or not repo_desc:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    try:
        sub_repo_id = seafile_api.create_virtual_repo(orig_repo_id, orig_path,
                                                  repo_name, repo_desc, owner)
    except SearpcError, e:
        result['error'] = e.msg
        return HttpResponse(json.dumps(result), status=500, content_type=content_type)

    result['success'] = True
    result['sub_repo_id'] = sub_repo_id
    repo_created.send(sender=None, org_id=-1, creator=owner, repo_id=sub_repo_id, repo_name=repo_name)
    return HttpResponse(json.dumps(result), content_type=content_type)

