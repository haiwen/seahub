# -*- coding: utf-8 -*-
import os
import posixpath

from django.shortcuts import render, get_object_or_404
from django.utils.translation import gettext as _
from seaserv import seafile_api

from seahub.auth.decorators import login_required
from seahub.views import check_folder_permission
from seahub.utils import render_permission_error
from seahub.drafts.models import Draft
from seahub.api2.utils import user_to_dict
from seahub.tags.models import FileUUIDMap


@login_required
def drafts(request):
    return render(request, "react_app.html")


@login_required
def draft(request, pk):
    d = get_object_or_404(Draft, pk=pk)

    # check perm
    uuid = FileUUIDMap.objects.get_fileuuidmap_by_uuid(d.origin_file_uuid)
    origin_repo_id = d.origin_repo_id
    permission = check_folder_permission(request, origin_repo_id, '/')
    if not permission:
        return render_permission_error(request, _('Permission denied.'))

    origin_file_path = posixpath.join(uuid.parent_path, uuid.filename)
    origin_file = seafile_api.get_file_id_by_path(origin_repo_id, origin_file_path)
    origin_file_exists = True
    if not origin_file:
        origin_file_exists = False

    draft_file = seafile_api.get_file_id_by_path(origin_repo_id, d.draft_file_path)
    draft_file_exists = True
    if not draft_file:
        draft_file_exists = False

    draft_file_name = os.path.basename(d.draft_file_path)

    author_info = user_to_dict(d.username, avatar_size=32)

    return render(request, "draft.html", {
        "draft_id": d.id,
        "draft_repo_id": origin_repo_id,
        "draft_origin_file_path": origin_file_path,
        "draft_file_path": d.draft_file_path,
        "draft_file_name": draft_file_name,
        "permission": permission,
        "author": author_info['user_name'],
        "author_avatar_url": author_info['avatar_url'],
        "origin_file_exists": origin_file_exists,
        "draft_file_exists": draft_file_exists,
        "draft_status": d.status,
        "publish_file_version": d.publish_file_version,
        "origin_file_version": d.origin_file_version
    })
