# -*- coding: utf-8 -*-
"""
File related views, including view_file, view_history_file, view_trash_file,
view_snapshot_file, view_shared_file, file_edit, etc.
"""

import os
import hashlib
import simplejson as json
import stat
import urllib2
import chardet
import logging
import posixpath

from django.core.cache import cache
from django.contrib.sites.models import RequestSite
from django.contrib import messages
from django.contrib.auth.hashers import check_password
from django.core.urlresolvers import reverse
from django.db.models import F
from django.http import HttpResponse, Http404, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.template.loader import render_to_string
from django.utils.http import urlquote
from django.utils.translation import ugettext as _
from django.views.decorators.http import require_POST
from django.template.defaultfilters import filesizeformat

from seaserv import seafile_api
from seaserv import get_repo, web_get_access_token, send_message, \
    get_commits, check_permission, get_shared_groups_by_repo,\
    is_group_user, get_file_id_by_path, get_commit, get_file_size, \
    get_org_groups_by_repo, seafserv_rpc, seafserv_threaded_rpc
from pysearpc import SearpcError

from seahub.auth.decorators import login_required
from seahub.base.decorators import repo_passwd_set_required
from seahub.base.models import FileContributors
from seahub.contacts.models import Contact
from seahub.share.models import FileShare, PrivateFileDirShare
from seahub.wiki.utils import get_wiki_dirent
from seahub.wiki.models import WikiDoesNotExist, WikiPageMissing
from seahub.utils import show_delete_days, render_error, \
    get_file_type_and_ext, gen_file_get_url, gen_file_share_link, \
    get_ccnetapplet_root, render_permission_error, \
    is_textual_file, show_delete_days, mkstemp, EMPTY_SHA1, HtmlDiff, \
    check_filename_with_rename, gen_inner_file_get_url, normalize_file_path
from seahub.utils.file_types import (IMAGE, PDF, IMAGE, DOCUMENT, MARKDOWN, \
                                         TEXT, SF)
from seahub.utils.star import is_file_starred
from seahub.utils import HAS_OFFICE_CONVERTER
from seahub.forms import SharedLinkPasswordForm

if HAS_OFFICE_CONVERTER:
    from seahub.utils import query_office_convert_status, query_office_file_pages, \
        prepare_converted_html, OFFICE_PREVIEW_MAX_SIZE

import seahub.settings as settings
from seahub.settings import FILE_ENCODING_LIST, FILE_PREVIEW_MAX_SIZE, \
    FILE_ENCODING_TRY_LIST, USE_PDFJS, MEDIA_URL, SITE_ROOT
from seahub.views import is_registered_user, get_repo_access_permission, \
    get_unencry_rw_repos_by_user

# Get an instance of a logger
logger = logging.getLogger(__name__)

def get_user_permission(request, repo_id):
    if request.user.is_authenticated():
        return check_permission(repo_id, request.user.username)
    else:
        token = request.COOKIES.get('anontoken', None)
        return 'r' if token else ''

def gen_path_link(path, repo_name):
    """
    Generate navigate paths and links in repo page.
    
    """
    if path and path[-1] != '/':
        path += '/'

    paths = []
    links = []
    if path and path != '/':
        paths = path[1:-1].split('/')
        i = 1
        for name in paths:
            link = '/' + '/'.join(paths[:i])
            i = i + 1
            links.append(link)
    if repo_name:
        paths.insert(0, repo_name)
        links.insert(0, '/')
        
    zipped = zip(paths, links)
    
    return zipped

def get_file_content(file_type, raw_path, file_enc):
    """Get textual file content, including txt/markdown/seaf.
    """
    return repo_file_get(raw_path, file_enc) if is_textual_file(
        file_type=file_type) else ('', '', '')

def repo_file_get(raw_path, file_enc):
    """
    Get file content and encoding.
    """
    err = ''
    file_content = ''
    encoding = None
    if file_enc != 'auto':
        encoding = file_enc

    try:
        file_response = urllib2.urlopen(raw_path)
        content = file_response.read()
    except urllib2.HTTPError, e:
        logger.error(e)
        err = _(u'HTTPError: failed to open file online')
        return err, '', None
    except urllib2.URLError as e:
        logger.error(e)
        err = _(u'URLError: failed to open file online')
        return err, '', None
    else:
        if encoding:
            try:
                u_content = content.decode(encoding)
            except UnicodeDecodeError:
                err = _(u'The encoding you chose is not proper.')
                return err, '', encoding
        else:
            for enc in FILE_ENCODING_TRY_LIST:
                try:
                    u_content = content.decode(enc)
                    encoding = enc
                    break
                except UnicodeDecodeError:
                    if enc != FILE_ENCODING_TRY_LIST[-1]:
                        continue
                    else:
                        encoding = chardet.detect(content)['encoding']
                        if encoding:
                            try:
                                u_content = content.decode(encoding)
                            except UnicodeDecodeError:
                                err = _(u'Unknown file encoding')
                                return err, '', ''
                        else:
                            err = _(u'Unknown file encoding')
                            return err, '', ''

        file_content = u_content

    return err, file_content, encoding


def get_file_view_path_and_perm(request, repo_id, obj_id, path):
    """ Get path and the permission to view file.

    Returns:
    	outer httpserver file url, inner httpserver file url, permission
    """
    username = request.user.username
    filename = os.path.basename(path)

    # user_perm = get_file_access_permission(repo_id, path, username) or \
    #     get_repo_access_permission(repo_id, username)
    user_perm = get_repo_access_permission(repo_id, username)
    if user_perm is None:
        return ('', '', user_perm)
    else:
        # Get a token to visit file
        token = web_get_access_token(repo_id, obj_id, 'view', username)
        outer_url = gen_file_get_url(token, filename)
        inner_url = gen_inner_file_get_url(token, filename)
        return (outer_url, inner_url, user_perm)

def handle_textual_file(request, filetype, raw_path, ret_dict):
    # encoding option a user chose
    file_enc = request.GET.get('file_enc', 'auto') 
    if not file_enc in FILE_ENCODING_LIST:
        file_enc = 'auto'
    err, file_content, encoding = get_file_content(filetype,
                                                   raw_path, file_enc)
    file_encoding_list = FILE_ENCODING_LIST
    if encoding and encoding not in FILE_ENCODING_LIST:
        file_encoding_list.append(encoding)
    # populate return value dict
    ret_dict['err'] = err
    ret_dict['file_content'] = file_content
    ret_dict['encoding'] = encoding
    ret_dict['file_enc'] = file_enc
    ret_dict['file_encoding_list'] = file_encoding_list

def handle_document(raw_path, obj_id, fileext, ret_dict):
    if HAS_OFFICE_CONVERTER:
        err, html_exists = prepare_converted_html(raw_path, obj_id, fileext, ret_dict)
        # populate return value dict
        ret_dict['err'] = err
        ret_dict['html_exists'] = html_exists
    else:
        ret_dict['filetype'] = 'Unknown'

def handle_pdf(raw_path, obj_id, fileext, ret_dict):
    if USE_PDFJS:
        # use pdfjs to preview PDF
        pass
    elif HAS_OFFICE_CONVERTER:
        # use flash to prefiew PDF
        err, html_exists = prepare_converted_html(raw_path, obj_id, fileext, ret_dict)
        # populate return value dict
        ret_dict['err'] = err
        ret_dict['html_exists'] = html_exists
    else:
        # can't preview PDF
        ret_dict['filetype'] = 'Unknown'

def convert_md_link(file_content, repo_id, username):
    import re

    def repl(matchobj):
        if matchobj.group(2):   # return origin string in backquotes
            return matchobj.group(2)

        link_alias = link_name = matchobj.group(1).strip()
        if len(link_name.split('|')) > 1:
            link_alias = link_name.split('|')[0]
            link_name = link_name.split('|')[1]

        filetype, fileext = get_file_type_and_ext(link_name)
        if fileext == '':
            # convert link_name that extension is missing to a markdown page
            try:
                dirent = get_wiki_dirent(repo_id, link_name)
                path = "/" + dirent.obj_name
                href = reverse('repo_view_file', args=[repo_id]) + '?p=' + urlquote(path)
                a_tag = '''<a href="%s">%s</a>'''
                return a_tag % (href, link_alias)
            except (WikiDoesNotExist, WikiPageMissing):
                a_tag = '''<p class="wiki-page-missing">%s</p>'''
                return a_tag % (link_alias)  
        elif filetype == IMAGE:
            # load image to current page
            path = "/" + link_name
            filename = os.path.basename(path)
            obj_id = get_file_id_by_path(repo_id, path)
            if not obj_id:
                return '''<p class="wiki-page-missing">%s</p>''' %  link_name

            token = web_get_access_token(repo_id, obj_id, 'view', username)
            return '<img class="wiki-image" src="%s" alt="%s" />' % (gen_file_get_url(token, filename), filename)
        else:
            from seahub.base.templatetags.seahub_tags import file_icon_filter
            
            # convert other types of filelinks to clickable links
            path = "/" + link_name
            icon = file_icon_filter(link_name)
            s = reverse('repo_view_file', args=[repo_id]) + '?p=' + urlquote(path)
            a_tag = '''<img src="%simg/file/%s" alt="%s" class="vam" /> <a href="%s" target="_blank" class="vam">%s</a>'''
            return a_tag % (MEDIA_URL, icon, icon, s, link_name)

    return re.sub(r'\[\[(.+?)\]\]|(`.+?`)', repl, file_content)

def file_size_exceeds_preview_limit(file_size, file_type):
    """Check whether file size exceeds the preview limit base on different
    type of file.
    """
    if file_type in (DOCUMENT, PDF) and HAS_OFFICE_CONVERTER:
        if file_size > OFFICE_PREVIEW_MAX_SIZE:
            err = _(u'File size surpasses %s, can not be opened online.') % \
                filesizeformat(OFFICE_PREVIEW_MAX_SIZE)
            return True, err
        else:
            return False, ''
    else:
        if file_size > FILE_PREVIEW_MAX_SIZE:
            err = _(u'File size surpasses %s, can not be opened online.') % \
                filesizeformat(FILE_PREVIEW_MAX_SIZE)
            return True, err
        else:
            return False, ''
    
@repo_passwd_set_required
def view_file(request, repo_id):
    """
    Steps to view file:
    1. Get repo id and file path.
    2. Check user's permission.
    3. Check whether this file can be viewed online.
    4.1 Get file content if file is text file.
    4.2 Prepare flash if file is document.
    4.3 Prepare or use pdfjs if file is pdf.
    4.4 Other file return it's raw path.
    """
    username = request.user.username
    # check arguments
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    path = request.GET.get('p', '/').rstrip('/')
    obj_id = get_file_id_by_path(repo_id, path)
    if not obj_id:
        return render_error(request, _(u'File does not exist'))

    # construct some varibles
    u_filename = os.path.basename(path)
    current_commit = get_commits(repo_id, 0, 1)[0]

    # Check whether user has permission to view file and get file raw path,
    # render error page if permission deny.
    raw_path, inner_path, user_perm = get_file_view_path_and_perm(request,
                                                                  repo_id,
                                                                  obj_id, path)
    if not user_perm:
        return render_permission_error(request, _(u'Unable to view file'))
    
    # check if the user is the owner or not, for 'private share'
    is_repo_owner = seafile_api.is_repo_owner(username, repo.id)

    # get file type and extension
    filetype, fileext = get_file_type_and_ext(u_filename)

    img_prev = None
    img_next = None
    ret_dict = {'err': '', 'file_content': '', 'encoding': '', 'file_enc': '',
                'file_encoding_list': [], 'html_exists': False,
                'filetype': filetype}
    
    fsize = get_file_size(obj_id)

    exceeds_limit, err_msg = file_size_exceeds_preview_limit(fsize, filetype)
    if exceeds_limit:
        ret_dict['err'] = err_msg
    else:
        """Choose different approach when dealing with different type of file."""
        if is_textual_file(file_type=filetype):
            handle_textual_file(request, filetype, inner_path, ret_dict)
            if filetype == MARKDOWN:
                c = ret_dict['file_content']
                ret_dict['file_content'] = convert_md_link(c, repo_id, username)
        elif filetype == DOCUMENT:
            handle_document(inner_path, obj_id, fileext, ret_dict)
        elif filetype == PDF:
            handle_pdf(inner_path, obj_id, fileext, ret_dict)
        elif filetype == IMAGE:
            parent_dir = os.path.dirname(path)
            dirs = seafile_api.list_dir_by_commit_and_path(current_commit.id, parent_dir)
            if not dirs:
                raise Http404

            img_list = []
            for dirent in dirs:
                if not stat.S_ISDIR(dirent.props.mode):
                    fltype, flext = get_file_type_and_ext(dirent.obj_name)
                    if fltype == 'Image':
                        img_list.append(dirent.obj_name)

            if len(img_list) > 1:
                img_list.sort(lambda x, y : cmp(x.lower(), y.lower()))
                cur_img_index = img_list.index(u_filename) 
                if cur_img_index != 0:
                    img_prev = posixpath.join(parent_dir, img_list[cur_img_index - 1])
                if cur_img_index != len(img_list) - 1:
                    img_next = posixpath.join(parent_dir, img_list[cur_img_index + 1])
        else:
            pass

    # generate file path navigator
    zipped = gen_path_link(path, repo.name)

    # file shared link
    l = FileShare.objects.filter(repo_id=repo_id).filter(
        username=username).filter(path=path)
    fileshare = l[0] if len(l) > 0 else None
    http_or_https = request.is_secure() and 'https' or 'http'
    domain = RequestSite(request).domain
    if fileshare:
        file_shared_link = gen_file_share_link(fileshare.token)
    else:
        file_shared_link = ''

    # my contacts used in shared link autocomplete
    contacts = Contact.objects.filter(user_email=username)

    """List repo groups"""
    # Get groups this repo is shared.    
    if request.user.org:
        org_id = request.user.org['org_id']
        repo_shared_groups = get_org_groups_by_repo(org_id, repo_id)
    else:
        repo_shared_groups = get_shared_groups_by_repo(repo_id)
    # Filter out groups that user in joined.
    groups = [ x for x in repo_shared_groups if is_group_user(x.id, username)]
    if len(groups) > 1:
        ctx = {}
        ctx['groups'] = groups
        repogrp_str = render_to_string("snippets/repo_group_list.html", ctx)
    else:
        repogrp_str = '' 
    
    file_path_hash = hashlib.md5(urllib2.quote(path.encode('utf-8'))).hexdigest()[:12]            

    # fetch file contributors and latest contributor
    contributors, last_modified, last_commit_id = \
        FileContributors.objects.get_file_contributors(
        repo_id, path.encode('utf-8'), file_path_hash, obj_id)
    latest_contributor = contributors[0] if contributors else None

    # check whether file is starred
    is_starred = False
    org_id = -1
    if request.user.org:
        org_id = request.user.org['org_id']
    is_starred = is_file_starred(username, repo.id, path.encode('utf-8'), org_id)

    template = 'view_file_%s.html' % ret_dict['filetype'].lower()
    search_repo_id = None
    if not repo.encrypted:
        search_repo_id = repo.id
    return render_to_response(template, {
            'repo': repo,
            'is_repo_owner': is_repo_owner,
            'obj_id': obj_id,
            'filename': u_filename,
            'path': path,
            'zipped': zipped,
            'current_commit': current_commit,
            'fileext': fileext,
            'raw_path': raw_path,
            'fileshare': fileshare,
            'protocol': http_or_https,
            'domain': domain,
            'file_shared_link': file_shared_link,
            'contacts': contacts,
            'err': ret_dict['err'],
            'file_content': ret_dict['file_content'],
            'file_enc': ret_dict['file_enc'],
            'encoding': ret_dict['encoding'],
            'file_encoding_list':ret_dict['file_encoding_list'],
            'html_exists': ret_dict['html_exists'],
            'html_detail': ret_dict.get('html_detail', {}),
            'filetype': ret_dict['filetype'],
            "applet_root": get_ccnetapplet_root(),
            'groups': groups,
            'use_pdfjs':USE_PDFJS,
            'contributors': contributors,
            'latest_contributor': latest_contributor,
            'last_modified': last_modified,
            'last_commit_id': last_commit_id,
            'repo_group_str': repogrp_str,
            'is_starred': is_starred,
            'user_perm': user_perm,
            'img_prev': img_prev,
            'img_next': img_next,
            'search_repo_id': search_repo_id,
            }, context_instance=RequestContext(request))

def view_history_file_common(request, repo_id, ret_dict):
    # check arguments
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    path = request.GET.get('p', '/')
    
    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        raise Http404

    obj_id = request.GET.get('obj_id', '')
    if not obj_id:
        raise Http404
    
    # construct some varibles
    u_filename = os.path.basename(path)
    current_commit = get_commit(commit_id)
    if not current_commit:
        raise Http404

    # Check whether user has permission to view file and get file raw path,
    # render error page if permission  deny.
    raw_path, inner_path, user_perm = get_file_view_path_and_perm(request,
                                                                  repo_id,
                                                                  obj_id, path)
    request.user_perm = user_perm

    # get file type and extension
    filetype, fileext = get_file_type_and_ext(u_filename)

    if user_perm:
        # Check file size
        fsize = get_file_size(obj_id)
        if fsize > FILE_PREVIEW_MAX_SIZE:
            err = _(u'File size surpasses %s, can not be opened online.') % \
                filesizeformat(FILE_PREVIEW_MAX_SIZE)
            ret_dict['err'] = err

        elif filetype in (DOCUMENT, PDF) and HAS_OFFICE_CONVERTER and fsize > OFFICE_PREVIEW_MAX_SIZE:
            err = _(u'File size surpasses %s, can not be opened online.') % \
                filesizeformat(OFFICE_PREVIEW_MAX_SIZE)
            ret_dict['err'] = err
        else:
            """Choose different approach when dealing with different type of file."""
            if is_textual_file(file_type=filetype):
                handle_textual_file(request, filetype, inner_path, ret_dict)
            elif filetype == DOCUMENT:
                handle_document(inner_path, obj_id, fileext, ret_dict)
            elif filetype == PDF:
                handle_pdf(inner_path, obj_id, fileext, ret_dict)
            else:
                pass
    # populate return value dict
    ret_dict['repo'] = repo
    ret_dict['obj_id'] = obj_id
    ret_dict['file_name'] = u_filename
    ret_dict['path'] = path
    ret_dict['current_commit'] = current_commit
    ret_dict['fileext'] = fileext
    ret_dict['raw_path'] = raw_path
    if not ret_dict.has_key('filetype'):    
        ret_dict['filetype'] = filetype 
    ret_dict['use_pdfjs'] = USE_PDFJS

    if not repo.encrypted:
        ret_dict['search_repo_id'] = repo.id

@repo_passwd_set_required
def view_history_file(request, repo_id):
    ret_dict = {}
    view_history_file_common(request, repo_id, ret_dict)
    if not request.user_perm:
        return render_permission_error(request, _(u'Unable to view file'))
        
    # generate file path navigator
    path = ret_dict['path']
    repo = ret_dict['repo']
    ret_dict['zipped'] = gen_path_link(path, repo.name)

    return render_to_response('view_history_file.html', ret_dict,
                              context_instance=RequestContext(request))

@repo_passwd_set_required
def view_trash_file(request, repo_id):
    ret_dict = {}
    view_history_file_common(request, repo_id, ret_dict)
    if not request.user_perm:
        return render_permission_error(request, _(u'Unable to view file'))

    basedir = request.GET.get('base', '')
    if not basedir:
        raise Http404
    days = show_delete_days(request)
    ret_dict['basedir'] = basedir
    ret_dict['days'] = days
    
    # generate file path navigator
    path = ret_dict['path']
    repo = ret_dict['repo']
    ret_dict['zipped'] = gen_path_link(path, repo.name)

    return render_to_response('view_trash_file.html', ret_dict,
                              context_instance=RequestContext(request), )
    
@repo_passwd_set_required
def view_snapshot_file(request, repo_id):
    ret_dict = {}
    view_history_file_common(request, repo_id, ret_dict)
    if not request.user_perm:
        return render_permission_error(request, _(u'Unable to view file'))
    
    # generate file path navigator
    path = ret_dict['path']
    repo = ret_dict['repo']
    ret_dict['zipped'] = gen_path_link(path, repo.name)

    return render_to_response('view_snapshot_file.html', ret_dict,
                              context_instance=RequestContext(request), )

def view_shared_file(request, token):
    """
    Preview file via shared link.
    """
    assert token is not None    # Checked by URLconf

    try:
        fileshare = FileShare.objects.get(token=token)
    except FileShare.DoesNotExist:
        raise Http404

    if fileshare.use_passwd:
        valid_access = cache.get('SharedLink_' + request.user.username + token, False)
        if not valid_access:
            d = { 'token': token, 'view_name': 'view_shared_file', }
            if request.method == 'POST':
                form = SharedLinkPasswordForm(request.POST)
                d['form'] = form
                if form.is_valid() and\
                   check_password(form.cleaned_data['password'], fileshare.password):
                    # set cache for non-anonymous user
                    if request.user.is_authenticated():
                        cache.set('SharedLink_' + request.user.username + token, True,
                                  settings.SHARE_ACCESS_PASSWD_TIMEOUT)
                else:
                    return render_to_response('share_access_validation.html', d,
                                              context_instance=RequestContext(request))
            else:
                return render_to_response('share_access_validation.html', d,
                                          context_instance=RequestContext(request))

    shared_by = fileshare.username
    repo_id = fileshare.repo_id
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    path = fileshare.path.rstrip('/') # Normalize file path 
    obj_id = seafile_api.get_file_id_by_path(repo_id, path)
    if not obj_id:
        return render_error(request, _(u'File does not exist'))
    file_size = seafile_api.get_file_size(obj_id)
    
    filename = os.path.basename(path)
    filetype, fileext = get_file_type_and_ext(filename)
    access_token = seafserv_rpc.web_get_access_token(repo.id, obj_id,
                                                     'view', '')
    raw_path = gen_file_get_url(access_token, filename)
    inner_path = gen_inner_file_get_url(access_token, filename)

    # get file content
    ret_dict = {'err': '', 'file_content': '', 'encoding': '', 'file_enc': '',
                'file_encoding_list': [], 'html_exists': False,
                'filetype': filetype}
    fsize = get_file_size(obj_id)
    exceeds_limit, err_msg = file_size_exceeds_preview_limit(fsize, filetype)
    if exceeds_limit:
        err = err_msg
    else:
        """Choose different approach when dealing with different type of file."""

        if is_textual_file(file_type=filetype):
            handle_textual_file(request, filetype, inner_path, ret_dict)
        elif filetype == DOCUMENT:
            handle_document(inner_path, obj_id, fileext, ret_dict)
        elif filetype == PDF:
            handle_pdf(inner_path, obj_id, fileext, ret_dict)

        # Increase file shared link view_cnt, this operation should be atomic
        fileshare.view_cnt = F('view_cnt') + 1
        fileshare.save()

        # send statistic messages
        if ret_dict['filetype'] != 'Unknown':
            try:
                obj_size = seafserv_threaded_rpc.get_file_size(obj_id)
                send_message('seahub.stats', 'file-view\t%s\t%s\t%s\t%s' % \
                             (repo.id, shared_by, obj_id, obj_size))
            except SearpcError, e:
                logger.error('Error when sending file-view message: %s' % str(e))

    accessible_repos = get_unencry_rw_repos_by_user(request.user.username)
    save_to_link = reverse('save_shared_link') + '?t=' + token
            
    return render_to_response('shared_file_view.html', {
            'repo': repo,
            'obj_id': obj_id,
            'path': path,
            'file_name': filename,
            'file_size': file_size,
            'shared_token': token,
            'access_token': access_token,
            'fileext': fileext,
            'raw_path': raw_path,
            'shared_by': shared_by,
            'err': ret_dict['err'],
            'file_content': ret_dict['file_content'],
            'encoding': ret_dict['encoding'],
            'file_encoding_list':ret_dict['file_encoding_list'],
            'html_exists': ret_dict['html_exists'],
            'html_detail': ret_dict.get('html_detail', {}),
            'filetype': ret_dict['filetype'],
            'use_pdfjs':USE_PDFJS,
            'accessible_repos': accessible_repos,
            'save_to_link': save_to_link,
            }, context_instance=RequestContext(request))

def view_file_via_shared_dir(request, token):
    assert token is not None    # Checked by URLconf

    try:
        fileshare = FileShare.objects.get(token=token)
    except FileShare.DoesNotExist:
        raise Http404

    shared_by = fileshare.username
    repo_id = fileshare.repo_id
    repo = get_repo(repo_id)
    if not repo:
        raise Http404
    
    path = request.GET.get('p', '').rstrip('/')
    if not path:
        raise Http404
    if not path.startswith(fileshare.path): # Can not view upper dir of shared dir
        raise Http404
    zipped = gen_path_link(path, '')

    obj_id = seafile_api.get_file_id_by_path(repo_id, path)
    if not obj_id:
        return render_error(request, _(u'File does not exist'))
    file_size = seafile_api.get_file_size(obj_id)

    filename = os.path.basename(path)
    filetype, fileext = get_file_type_and_ext(filename)
    access_token = seafserv_rpc.web_get_access_token(repo.id, obj_id,
                                                     'view', '')
    raw_path = gen_file_get_url(access_token, filename)
    inner_path = gen_inner_file_get_url(access_token, filename)

    # get file content
    ret_dict = {'err': '', 'file_content': '', 'encoding': '', 'file_enc': '',
                'file_encoding_list': [], 'html_exists': False,
                'filetype': filetype}
    fsize = get_file_size(obj_id)
    exceeds_limit, err_msg = file_size_exceeds_preview_limit(fsize, filetype)
    if exceeds_limit:
        err = err_msg
    else:
        """Choose different approach when dealing with different type of file."""

        if is_textual_file(file_type=filetype):
            handle_textual_file(request, filetype, inner_path, ret_dict)
        elif filetype == DOCUMENT:
            handle_document(inner_path, obj_id, fileext, ret_dict)
        elif filetype == PDF:
            handle_pdf(inner_path, obj_id, fileext, ret_dict)

        # send statistic messages
        if ret_dict['filetype'] != 'Unknown':
            try:
                obj_size = seafserv_threaded_rpc.get_file_size(obj_id)
                send_message('seahub.stats', 'file-view\t%s\t%s\t%s\t%s' % \
                             (repo.id, shared_by, obj_id, obj_size))
            except SearpcError, e:
                logger.error('Error when sending file-view message: %s' % str(e))
        
    return render_to_response('shared_file_view.html', {
            'repo': repo,
            'obj_id': obj_id,
            'path': path,
            'file_name': filename,
            'file_size': file_size,
            'shared_token': token,
            'access_token': access_token,
            'fileext': fileext,
            'raw_path': raw_path,
            'shared_by': shared_by,
            'token': token,
            'err': ret_dict['err'],
            'file_content': ret_dict['file_content'],
            'encoding': ret_dict['encoding'],
            'file_encoding_list':ret_dict['file_encoding_list'],
            'html_exists': ret_dict['html_exists'],
            'html_detail': ret_dict.get('html_detail', {}),
            'filetype': ret_dict['filetype'],
            'use_pdfjs':USE_PDFJS,
            'zipped': zipped,
            }, context_instance=RequestContext(request))

def file_edit_submit(request, repo_id):
    content_type = 'application/json; charset=utf-8'
    def error_json(error_msg=_(u'Internal Error'), op=None):
        return HttpResponse(json.dumps({'error': error_msg, 'op': op}),
                            status=400,
                            content_type=content_type)

    username = request.user.username
    if get_repo_access_permission(repo_id, username) != 'rw':
        return error_json(_(u'Permission denied'))
        
    repo = get_repo(repo_id)
    if not repo:
        return error_json(_(u'The library does not exist.'))
    if repo.encrypted:
        repo.password_set = seafile_api.is_password_set(repo_id, username)
        if not repo.password_set:
            return error_json(_(u'The library is encrypted.'), 'decrypt')

    content = request.POST.get('content')
    encoding = request.POST.get('encoding')
    path = request.GET.get('p')

    if content is None or not path or encoding not in ["gbk", "utf-8"]:
        return error_json(_(u'Invalid arguments'))
    head_id = request.GET.get('head', None)

    content = content.encode(encoding)

    # first dump the file content to a tmp file, then update the file
    fd, tmpfile = mkstemp()
    def remove_tmp_file():
        try:
            os.remove(tmpfile)
        except:
            pass

    try:
        bytesWritten = os.write(fd, content)
    except:
        bytesWritten = -1
    finally:
        os.close(fd)

    if bytesWritten != len(content):
        remove_tmp_file()
        return error_json()

    req_from = request.GET.get('from', '')
    if req_from == 'wiki_page_edit' or req_from == 'wiki_page_new':
        try:
            gid = int(request.GET.get('gid', 0))
        except ValueError:
            gid = 0
        
        wiki_name = os.path.splitext(os.path.basename(path))[0]
        next = reverse('group_wiki', args=[gid, wiki_name])
    elif req_from == 'personal_wiki_page_edit' or req_from == 'personal_wiki_page_new':
        wiki_name = os.path.splitext(os.path.basename(path))[0]
        next = reverse('personal_wiki', args=[wiki_name])
    else:
        next = reverse('repo_view_file', args=[repo_id]) + '?p=' + urlquote(path)

    parent_dir = os.path.dirname(path).encode('utf-8')
    filename = os.path.basename(path).encode('utf-8')
    try:
        seafserv_threaded_rpc.put_file(repo_id, tmpfile, parent_dir,
                                 filename, username, head_id)
        remove_tmp_file()
        return HttpResponse(json.dumps({'href': next}),
                            content_type=content_type)
    except SearpcError, e:
        remove_tmp_file()
        return error_json(str(e))

@login_required
def file_edit(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    if request.method == 'POST':
        return file_edit_submit(request, repo_id)

    if get_user_permission(request, repo_id) != 'rw':
        return render_permission_error(request, _(u'Unable to edit file'))

    path = request.GET.get('p', '/')
    if path[-1] == '/':
        path = path[:-1]
    u_filename = os.path.basename(path)
    filename = urllib2.quote(u_filename.encode('utf-8'))

    head_id = repo.head_cmmt_id

    obj_id = get_file_id_by_path(repo_id, path)
    if not obj_id:
        return render_error(request, _(u'The file does not exist.'))

    token = web_get_access_token(repo_id, obj_id, 'view', request.user.username)

    # generate path and link
    zipped = gen_path_link(path, repo.name)

    filetype, fileext = get_file_type_and_ext(filename)

    op = None
    err = ''
    file_content = None
    encoding = None
    file_encoding_list = FILE_ENCODING_LIST
    if filetype == TEXT or filetype == MARKDOWN or filetype == SF: 
        if repo.encrypted:
            repo.password_set = seafile_api.is_password_set(repo_id, request.user.username)
            if not repo.password_set:
                op = 'decrypt'
        if not op:
            inner_path = gen_inner_file_get_url(token, filename)
            file_enc = request.GET.get('file_enc', 'auto')
            if not file_enc in FILE_ENCODING_LIST:
                file_enc = 'auto'
            err, file_content, encoding = repo_file_get(inner_path, file_enc)
            if encoding and encoding not in FILE_ENCODING_LIST:
                file_encoding_list.append(encoding)
    else:
        err = _(u'Edit online is not offered for this type of file.')

    # Redirect to different place according to from page when user click
    # cancel button on file edit page.
    cancel_url = reverse('repo_view_file', args=[repo.id]) + '?p=' + urlquote(path)
    page_from = request.GET.get('from', '')
    gid = request.GET.get('gid', '')
    wiki_name = os.path.splitext(u_filename)[0]
    if page_from == 'wiki_page_edit' or page_from == 'wiki_page_new':
        cancel_url = reverse('group_wiki', args=[gid, wiki_name])
    elif page_from == 'personal_wiki_page_edit' or page_from == 'personal_wiki_page_new':
        cancel_url = reverse('personal_wiki', args=[wiki_name])

    search_repo_id = None
    if not repo.encrypted:
        search_repo_id = repo.id

    return render_to_response('file_edit.html', {
        'repo':repo,
        'u_filename':u_filename,
        'wiki_name': wiki_name,
        'path':path,
        'zipped':zipped,
        'filetype':filetype,
        'fileext':fileext,
        'op':op,
        'err':err,
        'file_content':file_content,
        'encoding': encoding,
        'file_encoding_list':file_encoding_list,
        'head_id': head_id,
        'from': page_from,
        'gid': gid,
        'cancel_url': cancel_url,
        'search_repo_id': search_repo_id,
    }, context_instance=RequestContext(request))

########## text diff
def get_file_content_by_commit_and_path(request, repo_id, commit_id, path, file_enc):
    try:
        obj_id = seafserv_threaded_rpc.get_file_id_by_commit_and_path( \
                                        commit_id, path)
    except:
        return None, 'bad path'

    if not obj_id or obj_id == EMPTY_SHA1:
        return '', None
    else:
        permission = get_user_permission(request, repo_id)
        if permission:
            # Get a token to visit file
            token = seafserv_rpc.web_get_access_token(repo_id,
                                                      obj_id,
                                                      'view',
                                                      request.user.username)
        else:
            return None, 'permission denied'

        filename = os.path.basename(path)
        inner_path = gen_inner_file_get_url(token, filename)

        try:
            err, file_content, encoding = repo_file_get(inner_path, file_enc)
        except Exception, e:
            return None, 'error when read file from httpserver: %s' % e
        return file_content, err

@login_required    
def text_diff(request, repo_id):
    commit_id = request.GET.get('commit', '')
    path = request.GET.get('p', '')
    u_filename = os.path.basename(path)
    file_enc = request.GET.get('file_enc', 'auto') 
    if not file_enc in FILE_ENCODING_LIST:
        file_enc = 'auto'

    if not (commit_id and path):
        return render_error(request, 'bad params')
        
    repo = get_repo(repo_id)
    if not repo:
        return render_error(request, 'bad repo')

    current_commit = seafserv_threaded_rpc.get_commit(commit_id)
    if not current_commit:
        return render_error(request, 'bad commit id')

    prev_commit = seafserv_threaded_rpc.get_commit(current_commit.parent_id)
    if not prev_commit:
        return render_error('bad commit id')

    path = path.encode('utf-8')

    current_content, err = get_file_content_by_commit_and_path(request, \
                                    repo_id, current_commit.id, path, file_enc)
    if err:
        return render_error(request, err)
        
    prev_content, err = get_file_content_by_commit_and_path(request, \
                                    repo_id, prev_commit.id, path, file_enc)
    if err:
        return render_error(request, err)

    is_new_file = False
    diff_result_table = ''
    if prev_content == '' and current_content == '':
        is_new_file = True
    else:
        diff = HtmlDiff()
        diff_result_table = diff.make_table(prev_content.splitlines(),
                                        current_content.splitlines(), True)

    zipped = gen_path_link(path, repo.name)

    search_repo_id = None
    if not repo.encrypted:
        search_repo_id = repo.id
    
    return render_to_response('text_diff.html', {
        'u_filename':u_filename,
        'repo': repo,
        'path': path,
        'zipped': zipped,
        'current_commit': current_commit,
        'prev_commit': prev_commit,
        'diff_result_table': diff_result_table,
        'is_new_file': is_new_file,
        'search_repo_id': search_repo_id,
    }, context_instance=RequestContext(request))

########## office related
def office_convert_query_status(request):
    if not HAS_OFFICE_CONVERTER:
        raise Http404

    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    ret = {'success': False}

    file_id = request.GET.get('file_id', '')
    if len(file_id) != 40:
        ret['error'] = 'invalid param'
    else:
        try:
            d = query_office_convert_status(file_id)
            if d.error:
                ret['error'] = d.error
            else:
                ret['success'] = True
                ret['status'] = d.status
        except Exception, e:
            logging.exception('failed to call query_office_convert_status')
            ret['error'] = str(e)
            
    return HttpResponse(json.dumps(ret), content_type=content_type)

def office_convert_query_page_num(request):
    if not HAS_OFFICE_CONVERTER:
        raise Http404

    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    ret = {'success': False}

    file_id = request.GET.get('file_id', '')
    if len(file_id) != 40:
        ret['error'] = 'invalid param'
    else:
        try:
            d = query_office_file_pages(file_id)
            if d.error:
                ret['error'] = d.error
            else:
                ret['success'] = True
                ret['count'] = d.count
        except Exception, e:
            logging.exception('failed to call query_office_file_pages')
            ret['error'] = str(e)
            
    return HttpResponse(json.dumps(ret), content_type=content_type)

###### private file/dir shares
@login_required
def view_priv_shared_file(request, token):
    """View private shared file.
    """
    try:
        pfs = PrivateFileDirShare.objects.get_priv_file_dir_share_by_token(token)
    except PrivateFileDirShare.DoesNotExist:
        raise Http404

    repo_id = pfs.repo_id
    repo = get_repo(repo_id)
    if not repo:
        raise Http404
    
    username = request.user.username
    if username != pfs.from_user and username != pfs.to_user:
        raise Http404           # permission check

    path = normalize_file_path(pfs.path)
    obj_id = seafile_api.get_file_id_by_path(repo.id, path)
    if not obj_id:
        raise Http404

    filename = os.path.basename(path)
    filetype, fileext = get_file_type_and_ext(filename)
    
    access_token = seafile_api.get_httpserver_access_token(repo.id, obj_id,
                                                           'view', username)
    raw_path = gen_file_get_url(access_token, filename)
    inner_path = gen_inner_file_get_url(access_token, filename)

    # get file content
    ret_dict = {'err': '', 'file_content': '', 'encoding': '', 'file_enc': '',
                'file_encoding_list': [], 'html_exists': False,
                'filetype': filetype}
    fsize = get_file_size(obj_id)
    exceeds_limit, err_msg = file_size_exceeds_preview_limit(fsize, filetype)
    if exceeds_limit:
        err = err_msg
    else:
        """Choose different approach when dealing with different type of file."""

        if is_textual_file(file_type=filetype):
            handle_textual_file(request, filetype, inner_path, ret_dict)
        elif filetype == DOCUMENT:
            handle_document(inner_path, obj_id, fileext, ret_dict)
        elif filetype == PDF:
            handle_pdf(inner_path, obj_id, fileext, ret_dict)

    accessible_repos = get_unencry_rw_repos_by_user(username)
    save_to_link = reverse('save_private_file_share', args=[pfs.token])

    return render_to_response('shared_file_view.html', {
            'repo': repo,
            'obj_id': obj_id,
            'path': path,
            'file_name': filename,
            'file_size': fsize,
            'access_token': access_token,
            'fileext': fileext,
            'raw_path': raw_path,
            'shared_by': pfs.from_user,
            'err': ret_dict['err'],
            'file_content': ret_dict['file_content'],
            'encoding': ret_dict['encoding'],
            'file_encoding_list':ret_dict['file_encoding_list'],
            'html_exists': ret_dict['html_exists'],
            'html_detail': ret_dict.get('html_detail', {}),
            'filetype': ret_dict['filetype'],
            'use_pdfjs':USE_PDFJS,
            'accessible_repos': accessible_repos,
            'save_to_link': save_to_link,
            }, context_instance=RequestContext(request))
