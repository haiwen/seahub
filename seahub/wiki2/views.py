# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
import posixpath
import time
from datetime import datetime

from seaserv import seafile_api

from django.urls import reverse
from django.http import HttpResponseRedirect
from django.shortcuts import render, get_object_or_404, redirect

from seahub.share.models import FileShare
from seahub.wiki2.models import Wiki2 as Wiki
from seahub.views import check_folder_permission
from seahub.utils import get_file_type_and_ext, render_permission_error, is_pro_version
from seahub.utils.file_types import IMAGE, SEADOC
from seahub.seadoc.utils import get_seadoc_file_uuid, gen_seadoc_access_token
from seahub.auth.decorators import login_required
from seahub.wiki2.utils import can_edit_wiki, check_wiki_permission, get_wiki_config

from seahub.utils.file_op import check_file_lock, ONLINE_OFFICE_LOCK_OWNER, if_locked_by_online_office
from seahub.utils.repo import parse_repo_perm
from seahub.settings import SEADOC_SERVER_URL

# Get an instance of a logger
logger = logging.getLogger(__name__)


@login_required
def wiki_view(request, wiki_id):
    """ edit wiki page. for wiki2
    """
    # get wiki object or 404
    wiki = get_object_or_404(Wiki, id=wiki_id)

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

    # perm check
    req_user = request.user.username
    if not check_wiki_permission(wiki, req_user):
        return render_permission_error(request, 'Permission denied.')

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

    return render(request, "wiki/wiki_edit.html", {
        "wiki": wiki,
        "file_path": file_path,
        "repo_name": repo.name if repo else '',
        "modifier": latest_contributor,
        "modify_time": last_modified,
        "seadoc_server_url": SEADOC_SERVER_URL
    })
