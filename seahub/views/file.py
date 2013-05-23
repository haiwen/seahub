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
from django.utils.http import urlquote
from django.utils.translation import ugettext as _
from seaserv import list_dir_by_path, get_repo, web_get_access_token, \
    get_commits, is_passwd_set, check_permission, get_shared_groups_by_repo,\
    is_group_user, get_file_id_by_path, get_commit, get_file_size, \
    get_org_groups_by_repo, seafserv_rpc, seafserv_threaded_rpc
from pysearpc import SearpcError

from seahub.auth.decorators import login_required
from seahub.base.decorators import repo_passwd_set_required
from seahub.base.models import UuidObjidMap
from seahub.contacts.models import Contact
from seahub.share.models import FileShare
from seahub.wiki.utils import get_wiki_dirent
from seahub.wiki.models import WikiDoesNotExist, WikiPageMissing
from seahub.utils import get_httpserver_root, show_delete_days, render_error, \
    get_file_type_and_ext, gen_file_get_url, gen_shared_link, is_file_starred, \
    get_file_contributors, get_ccnetapplet_root, render_permission_error, \
    is_textual_file, show_delete_days, mkstemp
from seahub.utils.file_types import (IMAGE, PDF, IMAGE, DOCUMENT, MARKDOWN, \
                                         TEXT, SF)
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

def prepare_converted_html(raw_path, obj_id, doctype):
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
        err, html_exists = prepare_converted_html(raw_path, obj_id, fileext)
        # populate return value dict
        ret_dict['err'] = err
        ret_dict['html_exists'] = html_exists
    else:
        ret_dict['filetype'] = 'Unknown'

def handle_pdf(raw_path, obj_id, fileext, ret_dict):
    if USE_PDFJS:
        # use pdfjs to preview PDF
        pass
    elif DOCUMENT_CONVERTOR_ROOT:
        # use flash to prefiew PDF
        err, html_exists = prepare_converted_html(raw_path, obj_id, fileext)
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
                'file_encoding_list': [], 'html_exists': False,
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
    
    file_path_hash = md5_constructor(urllib2.quote(path.encode('utf-8'))).hexdigest()[:12]            

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
    search_repo_id = None
    if not repo.encrypted:
        search_repo_id = repo.id
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
            'html_exists': ret_dict['html_exists'],
            'filetype': ret_dict['filetype'],
            "applet_root": get_ccnetapplet_root(),
            'groups': groups,
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
            'search_repo_id': search_repo_id,
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

def file_edit_submit(request, repo_id):
    content_type = 'application/json; charset=utf-8'
    def error_json(error_msg=_(u'Internal Error'), op=None):
        return HttpResponse(json.dumps({'error': error_msg, 'op': op}),
                            status=400,
                            content_type=content_type)

    if get_user_permission(request, repo_id) != 'rw':
        return error_json(_(u'Permission denied'))
        
    repo = get_repo(repo_id)
    if not repo:
        return error_json(_(u'The library does not exist.'))
    if repo.encrypted:
        repo.password_set = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
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

    if request.GET.get('from', '') == 'wiki_page_edit':
        try:
            gid = int(request.GET.get('gid', 0))
        except ValueError:
            gid = 0
        wiki_name = os.path.splitext(os.path.basename(path))[0]
        next = reverse('group_wiki', args=[gid, wiki_name])
    elif request.GET.get('from', '') == 'wiki_page_new':
        try:
            gid = int(request.GET.get('gid', 0))
        except ValueError:
            gid = 0
        next = reverse('group_wiki_pages', args=[gid])
    elif request.GET.get('from', '') == 'personal_wiki_page_edit':
        wiki_name = os.path.splitext(os.path.basename(path))[0]
        next = reverse('personal_wiki', args=[wiki_name])
    elif request.GET.get('from', '') == 'personal_wiki_page_new':
        next = reverse('personal_wiki_pages')
    else:
        next = reverse('repo_view_file', args=[repo_id]) + '?p=' + urlquote(path)

    parent_dir = os.path.dirname(path).encode('utf-8')
    filename = os.path.basename(path).encode('utf-8')
    try:
        seafserv_threaded_rpc.put_file(repo_id, tmpfile, parent_dir,
                                 filename, request.user.username, head_id)
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
            repo.password_set = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
            if not repo.password_set:
                op = 'decrypt'
        if not op:
            raw_path = gen_file_get_url(token, filename)
            file_enc = request.GET.get('file_enc', 'auto')
            if not file_enc in FILE_ENCODING_LIST:
                file_enc = 'auto'
            err, file_content, encoding = repo_file_get(raw_path, file_enc)
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

