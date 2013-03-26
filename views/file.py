# -*- coding: utf-8 -*-
"""
File related views, including view_file, edit_file, view_history_file,
view_trash_file, view_snapshot_file
"""

import os
import simplejson as json
import stat
import urllib
import urllib2
import chardet

from django.contrib.sites.models import Site, RequestSite
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseBadRequest, Http404, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, redirect
from django.template import Context, loader, RequestContext
from django.template.loader import render_to_string
from django.utils.hashcompat import md5_constructor
from django.utils.translation import ugettext as _
from seaserv import list_dir_by_path, get_repo, web_get_access_token, \
    get_commits, is_passwd_set, check_permission, get_shared_groups_by_repo,\
    is_group_user, get_file_id_by_path, get_commit, get_file_size
from pysearpc import SearpcError

from base.decorators import ctx_switch_required, repo_passwd_set_required
from base.models import UuidObjidMap, FileComment
from contacts.models import Contact
from share.models import FileShare
from seahub.utils import get_httpserver_root, show_delete_days, render_error,\
    get_file_type_and_ext, gen_file_get_url, gen_shared_link, is_file_starred,\
    get_file_contributors, get_ccnetapplet_root, render_permission_error, \
    is_textual_file, show_delete_days
from seahub.utils.file_types import (IMAGE, PDF, IMAGE, DOCUMENT, MARKDOWN)
from seahub.settings import FILE_ENCODING_LIST, FILE_PREVIEW_MAX_SIZE, \
    FILE_ENCODING_TRY_LIST, USE_PDFJS, MEDIA_URL
try:
    from seahub.settings import DOCUMENT_CONVERTOR_ROOT
    if DOCUMENT_CONVERTOR_ROOT[-1:] != '/':
        DOCUMENT_CONVERTOR_ROOT += '/'
except ImportError:
    DOCUMENT_CONVERTOR_ROOT = None


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
        i=1
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
        err = _(u'HTTPError: failed to open file online')
        return err, '', None
    except urllib2.URLError as e:
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

def flash_prepare(raw_path, obj_id, doctype):
    curl = DOCUMENT_CONVERTOR_ROOT + 'convert'
    data = {'doctype': doctype,
            'file_id': obj_id,
            'url': raw_path}
    try:
        f = urllib2.urlopen(url=curl, data=urllib.urlencode(data))
    except urllib2.URLError, e:
        return _(u'Internal error'), False
    else:
        ret = f.read()
        ret_dict = json.loads(ret)
        if ret_dict.has_key('error'):
            return ret_dict['error'], False
        else:
            return None, ret_dict['exists']

def get_file_view_path_and_perm(request, repo_id, obj_id, filename):
    """
    Return raw path of a file and the permission to view file.
    """
    username = request.user.username
    # check permission
    perm = get_user_permission(request, repo_id)
    if perm:
        # Get a token to visit file
        token = web_get_access_token(repo_id, obj_id, 'view', username)
        return (gen_file_get_url(token, filename), perm)
    else:
        return ('', perm)

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
    if DOCUMENT_CONVERTOR_ROOT:
        err, swf_exists = flash_prepare(raw_path, obj_id, fileext)
        # populate return value dict
        ret_dict['err'] = err
        ret_dict['swf_exists'] = swf_exists
    else:
        ret_dict['filetype'] = 'Unknown'

def handle_pdf(raw_path, obj_id, fileext, ret_dict):
    if USE_PDFJS:
        # use pdfjs to preview PDF
        pass
    elif DOCUMENT_CONVERTOR_ROOT:
        # use flash to prefiew PDF
        err, swf_exists = flash_prepare(raw_path, obj_id, fileext)
        # populate return value dict
        ret_dict['err'] = err
        ret_dict['swf_exists'] = swf_exists
    else:
        # can't preview PDF
        ret_dict['filetype'] = 'Unknown'

def convert_md_link(file_content, repo_id, username):
    import re

    def repl(matchobj):
        if matchobj.group(2):   # return origin string in backquotes
            return matchobj.group(2)

        linkname = matchobj.group(1).strip()
        filetype, fileext = get_file_type_and_ext(linkname)
        if fileext == '':
            # convert linkname that extension is missing to a markdown page
            filename = linkname + ".md"
            path = "/" + filename
            href = reverse('repo_view_file', args=[repo_id]) + '?p=' + path

            if get_file_id_by_path(repo_id, path):
                a_tag = '''<a href="%s">%s</a>'''
                return a_tag % (href, linkname)
            else:
                a_tag = '''<p class="wiki-page-missing">%s</p>'''
                return a_tag % (linkname)  
        elif filetype == IMAGE:
            # load image to current page
            path = "/" + linkname
            filename = os.path.basename(path)
            obj_id = get_file_id_by_path(repo_id, path)
            if not obj_id:
                return '''<p class="wiki-page-missing">%s</p>''' %  linkname

            token = web_get_access_token(repo_id, obj_id, 'view', username)
            return '<img src="%s" alt="%s" />' % (gen_file_get_url(token, filename), filename)
        else:
            from base.templatetags.seahub_tags import file_icon_filter
            
            # convert other types of filelinks to clickable links
            path = "/" + linkname
            icon = file_icon_filter(linkname)
            s = reverse('repo_view_file', args=[repo_id]) + '?p=' + path
            a_tag = '''<img src="%simg/file/%s" alt="%s" class="vam" /> <a href="%s" target="_blank" class="vam">%s</a>'''
            return a_tag % (MEDIA_URL, icon, icon, s, linkname)

    return re.sub(r'\[\[(.+)\]\]|(`.+`)', repl, file_content)
    
@ctx_switch_required
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

    path = request.GET.get('p', '/')
    obj_id = get_file_id_by_path(repo_id, path)
    if not obj_id:
        return render_error(request, _(u'File does not exist'))

    # construct some varibles
    u_filename = os.path.basename(path)
    filename_utf8 = urllib2.quote(u_filename.encode('utf-8'))
    comment_open = request.GET.get('comment_open', '')
    current_commit = get_commits(repo_id, 0, 1)[0]

    # Check whether user has permission to view file and get file raw path,
    # render error page if permission is deny.
    raw_path, user_perm = get_file_view_path_and_perm(request, repo_id,
                                                      obj_id, u_filename)
    if not user_perm:
        return render_permission_error(request, _(u'Unable to view file'))

    # get file type and extension
    filetype, fileext = get_file_type_and_ext(u_filename)

    img_prev = None
    img_next = None
    ret_dict = {'err': '', 'file_content': '', 'encoding': '', 'file_enc': '',
                'file_encoding_list': [], 'swf_exists': False,
                'filetype': filetype}
    
    # Check file size
    fsize = get_file_size(obj_id)
    if fsize > FILE_PREVIEW_MAX_SIZE:
        from django.template.defaultfilters import filesizeformat
        err = _(u'File size surpasses %s, can not be opened online.') % \
                    filesizeformat(FILE_PREVIEW_MAX_SIZE)
        ret_dict['err'] = err
    else:
        """Choose different approach when dealing with different type of file."""
        if is_textual_file(file_type=filetype):
            handle_textual_file(request, filetype, raw_path, ret_dict)
            if filetype == MARKDOWN:
                c = ret_dict['file_content']
                ret_dict['file_content'] = convert_md_link(c, repo_id, username)
        elif filetype == DOCUMENT:
            handle_document(raw_path, obj_id, fileext, ret_dict)
        elif filetype == PDF:
            handle_pdf(raw_path, obj_id, fileext, ret_dict)
        elif filetype == IMAGE:
            parent_dir = os.path.dirname(path)
            dirs = list_dir_by_path(current_commit.id, parent_dir)
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
                    img_prev = os.path.join(parent_dir, img_list[cur_img_index - 1])
                if cur_img_index != len(img_list) - 1:
                    img_next = os.path.join(parent_dir, img_list[cur_img_index + 1])
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
        file_shared_link = gen_shared_link(request, fileshare.token, 'f')
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
    
    # fetch file comments
    file_path_hash = md5_constructor(urllib2.quote(path.encode('utf-8'))).hexdigest()[:12]            
    comments = FileComment.objects.filter(file_path_hash=file_path_hash, repo_id=repo_id)

    # fetch file contributors and latest contributor
    contributors, last_modified, last_commit_id = get_file_contributors(repo_id, path.encode('utf-8'), file_path_hash, obj_id)
    latest_contributor = contributors[0] if contributors else None

    # check whether file is starred
    is_starred = False
    org_id = -1
    if request.user.org:
        org_id = request.user.org['org_id']
    is_starred = is_file_starred(username, repo.id, path.encode('utf-8'), org_id)

    template = 'view_file_%s.html' % ret_dict['filetype'].lower()
    return render_to_response(template, {
            'repo': repo,
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
            'swf_exists': ret_dict['swf_exists'],
            'filetype': ret_dict['filetype'],
            "applet_root": get_ccnetapplet_root(),
            'groups': groups,
            'comments': comments,
            'comment_open':comment_open,
            'DOCUMENT_CONVERTOR_ROOT': DOCUMENT_CONVERTOR_ROOT,
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
            }, context_instance=RequestContext(request))

def view_history_file_common(request, repo_id, ret_dict):
    username = request.user.username
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
    filename_utf8 = urllib2.quote(u_filename.encode('utf-8'))
    current_commit = get_commit(commit_id)
    if not current_commit:
        raise Http404

    # Check whether user has permission to view file and get file raw path,
    # render error page if permission is deny.
    raw_path, user_perm = get_file_view_path_and_perm(request, repo_id,
                                                      obj_id, u_filename)
    request.user_perm = user_perm

    # get file type and extension
    filetype, fileext = get_file_type_and_ext(u_filename)

    if user_perm:
        # Check file size
        fsize = get_file_size(obj_id)
        if fsize > FILE_PREVIEW_MAX_SIZE:
            from django.template.defaultfilters import filesizeformat
            err = _(u'File size surpasses %s, can not be opened online.') % \
                filesizeformat(FILE_PREVIEW_MAX_SIZE)
            ret_dict['err'] = err
        else:
            """Choose different approach when dealing with different type of file."""
            if is_textual_file(file_type=filetype):
                handle_textual_file(request, filetype, raw_path, ret_dict)
            elif filetype == DOCUMENT:
                handle_document(raw_path, obj_id, fileext, ret_dict)
            elif filetype == PDF:
                handle_pdf(raw_path, obj_id, fileext, ret_dict)
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
    ret_dict['DOCUMENT_CONVERTOR_ROOT'] = DOCUMENT_CONVERTOR_ROOT
    ret_dict['use_pdfjs'] = USE_PDFJS

@ctx_switch_required
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

@ctx_switch_required
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

    return render_to_response('view_history_file.html', ret_dict,
                              context_instance=RequestContext(request), )
    
@ctx_switch_required
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

    return render_to_response('view_history_file.html', ret_dict,
                              context_instance=RequestContext(request), )
