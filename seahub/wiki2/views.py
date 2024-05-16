# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
import posixpath
from datetime import datetime

from seaserv import seafile_api

from django.urls import reverse
from django.http import HttpResponseRedirect
from django.shortcuts import render, get_object_or_404, redirect

from seahub.share.models import FileShare
from seahub.wiki2.models import Wiki2 as Wiki
from seahub.views import check_folder_permission
from seahub.utils import get_file_type_and_ext, render_permission_error
from seahub.utils.file_types import IMAGE, SEADOC
from seahub.seadoc.utils import get_seadoc_file_uuid
from seahub.auth.decorators import login_required
from seahub.wiki2.utils import can_edit_wiki

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
    if not can_edit_wiki(wiki, req_user):
        return render_permission_error(request, 'Permission denied.')

    is_dir = None
    file_id = seafile_api.get_file_id_by_path(wiki.repo_id, file_path)
    if file_id:
        is_dir = False

    dir_id = seafile_api.get_dir_id_by_path(wiki.repo_id, file_path)
    if dir_id:
        is_dir = True

    file_content = ''
    outlines = []
    latest_contributor = ''
    last_modified = 0
    assets_url = ''
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

    last_modified = datetime.fromtimestamp(last_modified)

    return render(request, "wiki/wiki_edit.html", {
        "wiki": wiki,
        "repo_name": repo.name if repo else '',
        "user_can_write": True,
        "file_path": file_path,
        "filename": os.path.splitext(os.path.basename(file_path))[0],
        "file_content": file_content,
        "outlines": outlines,
        "modifier": latest_contributor,
        "modify_time": last_modified,
        "repo_id": wiki.repo_id,
        "is_dir": is_dir,
        "assets_url": assets_url,
    })
