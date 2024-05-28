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
from seahub.wiki2.utils import can_edit_wiki, check_wiki_permission

from seahub.utils.file_op import check_file_lock, ONLINE_OFFICE_LOCK_OWNER, if_locked_by_online_office
from seahub.utils.repo import parse_repo_perm
from seahub.settings import SEADOC_SERVER_URL

# Get an instance of a logger
logger = logging.getLogger(__name__)


@login_required
def wiki_view(request, wiki_id, file_path):
    """ edit wiki page. for wiki2
    """
    # get wiki object or 404
    wiki = get_object_or_404(Wiki, id=wiki_id)
    file_path = "/" + file_path

    # perm check
    req_user = request.user.username
    if not check_wiki_permission(wiki, req_user):
        return render_permission_error(request, 'Permission denied.')

    permission = check_folder_permission(request, wiki.repo_id, '/')
    if not permission:
        return render_permission_error(request, 'Permission denied.')

    is_dir = None
    file_id = seafile_api.get_file_id_by_path(wiki.repo_id, file_path)
    if file_id:
        is_dir = False

    dir_id = seafile_api.get_dir_id_by_path(wiki.repo_id, file_path)
    if dir_id:
        is_dir = True

    outlines = []
    latest_contributor = ''
    last_modified = 0
    assets_url = ''
    seadoc_access_token = ''
    file_type, ext = get_file_type_and_ext(posixpath.basename(file_path))
    repo = seafile_api.get_repo(wiki.repo_id)
    if is_dir is False and file_type == SEADOC:
        file_uuid = get_seadoc_file_uuid(repo, file_path)
        assets_url = '/api/v2.1/seadoc/download-image/' + file_uuid
        try:
            dirent = seafile_api.get_dirent_by_path(wiki.repo_id, file_path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
        except Exception as e:
            logger.warning(e)

        filename = os.path.basename(file_path)
        seadoc_access_token = gen_seadoc_access_token(file_uuid, filename, req_user, permission=permission)

    last_modified = datetime.fromtimestamp(last_modified)

    return render(request, "wiki/wiki_edit.html", {
        "wiki": wiki,
        "repo_name": repo.name if repo else '',
        "file_path": file_path,
        "filename": os.path.splitext(os.path.basename(file_path))[0],
        "outlines": outlines,
        "modifier": latest_contributor,
        "modify_time": last_modified,
        "repo_id": wiki.repo_id,
        "is_dir": is_dir,
        "assets_url": assets_url,
        "seadoc_server_url": SEADOC_SERVER_URL,
        "seadoc_access_token": seadoc_access_token,
        "permission": permission,
    })
