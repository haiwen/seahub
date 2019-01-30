# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import os
import re
import stat
import urllib2
import logging
import posixpath

from django.core.urlresolvers import reverse
from django.utils.http import urlquote
from django.utils.encoding import smart_str

import seaserv
from seaserv import seafile_api
from pysearpc import SearpcError
from seahub.utils.slugify import slugify
from seahub.utils import gen_file_get_url, get_file_type_and_ext, \
    gen_inner_file_get_url, get_site_scheme_and_netloc
from seahub.utils.file_types import IMAGE
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from models import WikiPageMissing, WikiDoesNotExist, GroupWiki, PersonalWiki

logger = logging.getLogger(__name__)

__all__ = ["get_wiki_dirent", "clean_page_name", "page_name_to_file_name"]


SLUG_OK = "!@#$%^&()_+-,.;'"
def normalize_page_name(page_name):
    # Remove special characters. Lower page name and replace spaces with '-'.
    return slugify(page_name, ok=SLUG_OK)

def clean_page_name(page_name):
    # Remove special characters. Do not lower page name and spaces are allowed.
    return slugify(page_name, ok=SLUG_OK, lower=False, spaces=True)

def page_name_to_file_name(page_name):
    """Append ".md" if page name does not end with .md or .markdown.
    """
    if page_name.endswith('.md') or page_name.endswith('.markdown'):
        return page_name
    return page_name + '.md'

def get_wiki_dirent(repo_id, page_name):
    file_name = page_name_to_file_name(page_name)
    repo = seaserv.get_repo(repo_id)
    if not repo:
        raise WikiDoesNotExist
    cmmt = seaserv.get_commits(repo.id, 0, 1)[0]
    if cmmt is None:
        raise WikiPageMissing
    dirs = seafile_api.list_dir_by_commit_and_path(cmmt.repo_id, cmmt.id, "/")
    if dirs:
        for e in dirs:
            if stat.S_ISDIR(e.mode):
                continue    # skip directories
            if normalize_page_name(file_name) == normalize_page_name(e.obj_name):
                return e
    raise WikiPageMissing

def get_inner_file_url(repo, obj_id, file_name):
    repo_id = repo.id
    access_token = seafile_api.get_fileserver_access_token(repo_id, obj_id,
                                                           'view', '')
    url = gen_inner_file_get_url(access_token, file_name)
    return url

def get_personal_wiki_repo(username):
    try:
        wiki = PersonalWiki.objects.get(username=username)
    except PersonalWiki.DoesNotExist:
        raise WikiDoesNotExist
    repo = seaserv.get_repo(wiki.repo_id)
    if not repo:
        raise WikiDoesNotExist
    return repo

def get_group_wiki_repo(group, username):
    try:
        groupwiki = GroupWiki.objects.get(group_id=group.id)
    except GroupWiki.DoesNotExist:
        raise WikiDoesNotExist
        
    repos = seaserv.get_group_repos(group.id, username)
    for repo in repos:
        if repo.id == groupwiki.repo_id:
            return repo
    raise WikiDoesNotExist
    
def get_personal_wiki_page(username, page_name):
    repo = get_personal_wiki_repo(username)
    dirent = get_wiki_dirent(repo.id, page_name)
    url = get_inner_file_url(repo, dirent.obj_id, dirent.obj_name)
    file_response = urllib2.urlopen(url)
    content = file_response.read()
    return content, repo, dirent

def get_group_wiki_page(username, group, page_name):
    repo = get_group_wiki_repo(group, username)
    dirent = get_wiki_dirent(repo.id, page_name)
    url = get_inner_file_url(repo, dirent.obj_id, dirent.obj_name)
    file_response = urllib2.urlopen(url)
    content = file_response.read()
    return content, repo, dirent

def get_wiki_pages(repo):
    """
    return pages in hashtable {normalized_name: page_name}
    """
    dir_id = seaserv.seafserv_threaded_rpc.get_dir_id_by_path(repo.id, '/')
    if not dir_id:
        return {}
    dirs = seafile_api.list_dir_by_dir_id(repo.id, dir_id)
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

        page_alias = page_name = matchobj.group(1).strip()
        if len(page_name.split('|')) > 1:
            page_alias = page_name.split('|')[0]
            page_name = page_name.split('|')[1]
        
        filetype, fileext = get_file_type_and_ext(page_name)
        if fileext == '':
            # convert page_name that extension is missing to a markdown page
            try:
                dirent = get_wiki_dirent(repo_id, page_name)
                a_tag = '''<a href="%s">%s</a>'''
                return a_tag % (smart_str(url_prefix + normalize_page_name(page_name) + '/'), page_alias)
            except (WikiDoesNotExist, WikiPageMissing):
                a_tag = '''<a href="%s" class="wiki-page-missing">%s</a>'''
                return a_tag % (smart_str(url_prefix + normalize_page_name(page_name) + '/'), page_alias)
        elif filetype == IMAGE:
            # load image to wiki page
            path = "/" + page_name
            filename = os.path.basename(path)
            obj_id = seaserv.get_file_id_by_path(repo_id, path)
            if not obj_id:
                # Replace '/' in page_name to '-', since wiki name can not
                # contain '/'.
                return '''<a href="%s" class="wiki-page-missing">%s</a>''' % \
                    (url_prefix + '/' + page_name.replace('/', '-'), page_name)

            token = seafile_api.get_fileserver_access_token(repo_id, obj_id,
                                                            'view', username)
            ret = '<img src="%s" alt="%s" class="wiki-image" />' % (gen_file_get_url(token, filename), filename)
            return smart_str(ret)
        else:
            from seahub.base.templatetags.seahub_tags import file_icon_filter
            from django.conf import settings
            
            # convert other types of filelinks to clickable links
            path = "/" + page_name
            icon = file_icon_filter(page_name)
            s = reverse('view_lib_file', args=[repo_id, path])
            a_tag = '''<img src="%simg/file/%s" alt="%s" class="file-icon vam" /> <a href="%s" class="vam" target="_blank">%s</a>'''
            ret = a_tag % (settings.MEDIA_URL, icon, icon, smart_str(s), page_name)
            return smart_str(ret)

    return re.sub(r'\[\[(.+?)\]\]|(`.+?`)', repl, content)

def is_valid_wiki_name(name):
    name = name.strip()
    if len(name) > 255 or len(name) < 1:
        return False
    return True if re.match('^[\w\s-]+$', name, re.U) else False

def slugfy_wiki_name(name):
    return slugify(name, ok=SLUG_OK)

def get_wiki_page_object(wiki_object, page_name):
    page_name = clean_page_name(page_name)
    filepath = "/" + page_name + ".md"
    repo_id = wiki_object.repo_id

    try:
        dirent = seafile_api.get_dirent_by_path(repo_id, filepath)
        if dirent:
            latest_contributor, last_modified = dirent.modifier, dirent.mtime
        else:
            latest_contributor, last_modified = None, 0
    except SearpcError as e:
        logger.error(e)
        latest_contributor, last_modified = None, 0

    try:
        repo = seafile_api.get_repo(wiki_object.repo_id)
    except SearpcError as e:
        logger.error(e)

    file_url = get_inner_file_url(repo, dirent.obj_id, dirent.obj_name)

    edit_url = get_site_scheme_and_netloc().rstrip('/') + "%s?p=%s" % (
        reverse('file_edit', args=[repo_id]),
        urlquote(filepath.encode('utf-8')))

    slug = wiki_object.slug
    page_url = get_site_scheme_and_netloc().rstrip('/') + reverse('wiki:slug',
                                                                  args=[slug, page_name])

    # FIX ME: move to top after wiki code refactor
    from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email

    return {"name": page_name,
            "link": page_url,
            "file_link": file_url,
            "file_edit_link": edit_url,
            "updated_at": timestamp_to_isoformat_timestr(last_modified),
            "last_modifier": latest_contributor,
            "last_modifier_contact_email": email2contact_email(latest_contributor),
            "last_modifier_name": email2nickname(latest_contributor),
            }


def get_wiki_dirs_by_path(repo_id, path, all_dirs):
    dirs = seafile_api.list_dir_by_path(repo_id, path)

    for dirent in dirs:
        entry = {}
        if stat.S_ISDIR(dirent.mode):
            entry["type"] = 'dir'
        else:
            entry["type"] = 'file'

        entry["parent_dir"] = path
        entry["id"] = dirent.obj_id
        entry["name"] = dirent.obj_name
        entry["size"] = dirent.size
        entry["mtime"] = dirent.mtime

        all_dirs.append(entry)

    return all_dirs
