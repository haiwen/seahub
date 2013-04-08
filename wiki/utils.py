# -*- coding: utf-8 -*-
import os
import stat
import urllib2

import seaserv
from pysearpc import SearpcError
from seahub.utils import EMPTY_SHA1
from seahub.utils.repo import list_dir_by_path
from seahub.utils.slugify import slugify
from seahub.utils import render_error, render_permission_error, string2list, \
    gen_file_get_url, get_file_type_and_ext, \
    get_file_contributors

from models import WikiPageMissing, WikiDoesNotExist, \
    PersonalWiki

__all__ = ["get_wiki_dirent"]



SLUG_OK = "!@#$%^&()_+-,.;'"
def normalize_page_name(page_name):
    # Remove special characters. Lower page name and replace spaces with '-'.
    return slugify(page_name, ok=SLUG_OK)

def clean_page_name(page_name):
    # Remove special characters. Do not lower page name and spaces are allowed.
    return slugify(page_name, ok=SLUG_OK, lower=False, spaces=True)

def get_wiki_dirent(repo_id, page_name):
    file_name = page_name + ".md"
    repo = seaserv.get_repo(repo_id)
    if not repo:
        raise WikiDoesNotExist
    cmmt = seaserv.get_commits(repo.id, 0, 1)[0]
    if cmmt is None:
        raise WikiPageMissing
    dirs = list_dir_by_path(cmmt, "/")
    if not dirs:
        raise WikiPageMissing
    else:
        for e in dirs:
            if stat.S_ISDIR(e.mode):
                continue    # skip directories
            if normalize_page_name(file_name) == normalize_page_name(e.obj_name):
                return e
    raise WikiPageMissing

def get_file_url(repo, obj_id, file_name):
    repo_id = repo.id
    access_token = seaserv.seafserv_rpc.web_get_access_token(repo_id, obj_id,
                                                     'view', '')
    url = gen_file_get_url(access_token, file_name)
    return url

def get_wiki_page(request, page_name):
    repo = find_wiki_repo(request, group)
    dirent = get_wiki_dirent(repo.id, page_name)
    if not dirent:
        raise WikiPageMissing
    url = get_file_url(repo, dirent.obj_id, dirent.obj_name)
    file_response = urllib2.urlopen(url)
    content = file_response.read()
    return content, repo.id, dirent

def get_personal_wiki_repo(username):
    try:
        wiki = PersonalWiki.objects.get(username=username)
    except PersonalWiki.DoesNotExist:
        raise WikiDoesNotExist
    repo = seaserv.get_repo(wiki.repo_id)
    if not repo:
        raise WikiDoesNotExist
    return repo

def get_personal_wiki_page(username, page_name):
    repo = get_personal_wiki_repo(username)
    dirent = get_wiki_dirent(repo.id, page_name)
    url = get_file_url(repo, dirent.obj_id, dirent.obj_name)
    file_response = urllib2.urlopen(url)
    content = file_response.read()
    return content, repo, dirent

def get_wiki_pages(repo):
    """
    return pages in hashtable {normalized_name: page_name}
    """
    dir_id = seaserv.seafserv_threaded_rpc.get_dir_id_by_path(repo.id, '/')
    dirs = seaserv.seafserv_threaded_rpc.list_dir(dir_id)
    pages = {}
    for e in dirs:
        if stat.S_ISDIR(e.mode):
            continue            # skip directories
        name, ext = os.path.splitext(e.obj_name)
        if ext == '.md':
            key = normalize_page_name(name)
            pages[key] = name
    return pages
        

def convert_wiki_link(content, url_prefix, repo_id, username):
    import re

    def repl(matchobj):
        if matchobj.group(2):   # return origin string in backquotes
            return matchobj.group(2)

        page_name = matchobj.group(1).strip()
        filetype, fileext = get_file_type_and_ext(page_name)
        if fileext == '':
            # convert page_name that extension is missing to a markdown page
            dirent = get_wiki_dirent(repo_id, page_name)
            if dirent is not None:
                a_tag = "<a href='%s'>%s</a>"
                return a_tag % (url_prefix + '/' + normalize_page_name(page_name), page_name)
            else:
                a_tag = '''<a class="wiki-page-missing" href='%s'>%s</a>'''
                return a_tag % (url_prefix + '/' + page_name.replace('/', '-'), page_name)                                
        elif filetype == IMAGE:
            # load image to wiki page
            path = "/" + page_name
            filename = os.path.basename(path)
            obj_id = get_file_id_by_path(repo_id, path)
            if not obj_id:
                # Replace '/' in page_name to '-', since wiki name can not
                # contain '/'.
                return '''<a class="wiki-page-missing" href='%s'>%s</a>''' % \
                    (url_prefix + '/' + page_name.replace('/', '-'), page_name)

            token = seaserv.web_get_access_token(repo_id, obj_id, 'view', username)
            return '<img src="%s" alt="%s" />' % (gen_file_get_url(token, filename), filename)
        else:
            from base.templatetags.seahub_tags import file_icon_filter
            
            # convert other types of filelinks to clickable links
            path = "/" + page_name
            icon = file_icon_filter(page_name)
            s = reverse('repo_view_file', args=[repo_id]) + \
                '?p=' + urllib2.quote(smart_str(path))
            a_tag = '''<img src="%simg/file/%s" alt="%s" class="vam" /> <a href='%s' target='_blank' class="vam">%s</a>'''
            return a_tag % (MEDIA_URL, icon, icon, s, page_name)

    return re.sub(r'\[\[(.+)\]\]|(`.+`)', repl, content)


