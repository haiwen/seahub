# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
import posixpath
from datetime import datetime

from constance import config
from seaserv import seafile_api

from django.http import Http404
from django.shortcuts import render

from seahub.wiki2.models import Wiki2 as Wiki
from seahub.wiki2.models import Wiki2Publish
from seahub.utils import get_file_type_and_ext, render_permission_error
from seahub.utils.file_types import SEADOC
from seahub.auth.decorators import login_required
from seahub.wiki2.utils import check_wiki_permission, get_wiki_config

from seahub.utils.repo import get_repo_owner, is_repo_admin, is_repo_owner, is_group_repo_staff
from seahub.settings import SEADOC_SERVER_URL

# Get an instance of a logger
logger = logging.getLogger(__name__)


@login_required
def wiki_view(request, wiki_id):
    """ edit wiki page. for wiki2
    """
    # get wiki object or 404
    wiki = Wiki.objects.get(wiki_id=wiki_id)
    if not wiki:
        raise Http404
    
    username = request.user.username
    repo_owner = get_repo_owner(request, wiki_id)
    wiki.owner = repo_owner
    
    page_id = request.GET.get('page_id')
    file_path = ''

    if page_id:
        wiki_config = get_wiki_config(wiki.repo_id, username)
        pages = wiki_config.get('pages', [])
        page_info = next(filter(lambda t: t['id'] == page_id, pages), {})
        file_path = page_info.get('path', '')

    is_page = False
    if file_path:
        is_page = True

    # perm check
    permission = check_wiki_permission(wiki, username)
    if not check_wiki_permission(wiki, username):
        return render_permission_error(request, 'Permission denied.')

    latest_contributor = ''
    last_modified = 0
    file_type, ext = get_file_type_and_ext(posixpath.basename(file_path))
    repo_id = wiki.repo_id
    repo = seafile_api.get_repo(repo_id)
    if is_page and file_type == SEADOC:
        try:
            dirent = seafile_api.get_dirent_by_path(repo_id, file_path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
        except Exception as e:
            logger.warning(e)

    
    is_admin = is_repo_admin(username, repo_id)
    last_modified = datetime.fromtimestamp(last_modified)
    return render(request, "wiki/wiki_edit.html", {
        "wiki": wiki,
        "is_admin": is_admin,
        "file_path": file_path,
        "repo_name": repo.name if repo else '',
        "modifier": latest_contributor,
        "modify_time": last_modified,
        "seadoc_server_url": SEADOC_SERVER_URL,
        "permission": permission,
        "enable_user_clean_trash": config.ENABLE_USER_CLEAN_TRASH
    })


def wiki_publish_view(request, publish_url):
    """ view wiki page. for wiki2
    1 permission
       All user
    """
    # get wiki_publish object or 404
    wiki_publish = Wiki2Publish.objects.filter(publish_url=publish_url).first()
    if not wiki_publish:
        raise Http404

    wiki_id = wiki_publish.repo_id
    wiki = Wiki.objects.get(wiki_id=wiki_id)
    if not wiki:
        raise Http404

    repo_owner = get_repo_owner(request, wiki_id)
    wiki.owner = repo_owner

    page_id = request.GET.get('page_id')
    file_path = ''

    if page_id:
        wiki_config = get_wiki_config(wiki.repo_id, request.user.username)
        pages = wiki_config.get('pages', [])
        page_info = next(filter(lambda t: t['id'] == page_id, pages), {})
        file_path = page_info.get('path', '')

    is_page = False
    if file_path:
        is_page = True

    latest_contributor = ''
    last_modified = 0
    file_type, ext = get_file_type_and_ext(posixpath.basename(file_path))
    repo = seafile_api.get_repo(wiki.repo_id)
    if is_page and file_type == SEADOC:
        try:
            dirent = seafile_api.get_dirent_by_path(wiki.repo_id, file_path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
        except Exception as e:
            logger.warning(e)

    last_modified = datetime.fromtimestamp(last_modified)
    # update visit_count
    try:
        current_count = wiki_publish.visit_count
        wiki_publish.visit_count = current_count + 1
        wiki_publish.save()
    except Exception as e:
        logger.warning(e)

    return render(request, "wiki/wiki_publish.html", {
        "wiki": wiki,
        "file_path": file_path,
        "repo_name": repo.name if repo else '',
        "modifier": latest_contributor,
        "modify_time": last_modified,
        "seadoc_server_url": SEADOC_SERVER_URL,
        "permission": 'public'
    })
