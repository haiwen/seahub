# -*- coding: utf-8 -*-
import os
import posixpath

from django.shortcuts import render, get_object_or_404
from django.utils.translation import ugettext as _
from seaserv import seafile_api

from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.auth.decorators import login_required
from seahub.views import check_folder_permission
from seahub.utils import render_permission_error, render_error
from seahub.drafts.models import Draft, DraftReview
from seahub.api2.utils import user_to_dict


@login_required
def drafts(request):
    return render(request, "react_app.html")


@login_required
def reviews(request):
    return render(request, "react_app.html")


@login_required
def review(request, pk):
    d_r = get_object_or_404(DraftReview, pk=pk)

    # check perm
    uuid = d_r.origin_file_uuid
    origin_repo_id = d_r.origin_repo_id
    permission = check_folder_permission(request, origin_repo_id, '/')
    if not permission:
        return render_permission_error(request, _(u'Permission denied.'))

    origin_file_path = posixpath.join(uuid.parent_path, uuid.filename)
    origin_file = seafile_api.get_file_id_by_path(origin_repo_id, origin_file_path)
    origin_file_exists = True
    if not origin_file:
        origin_file_exists = False

    draft_file = seafile_api.get_file_id_by_path(origin_repo_id, d_r.draft_file_path)
    draft_file_exists = True
    if not draft_file:
        draft_file_exists = False

    draft_file_name = os.path.basename(d_r.draft_file_path)

    author_info = user_to_dict(d_r.author, avatar_size=32)

    return render(request, "draft_review.html", {
        "draft_id": d_r.draft_id_id,
        "review_id": pk,
        "draft_repo_id": d_r.origin_repo_id,
        "draft_origin_repo_id": d_r.origin_repo_id,
        "draft_origin_file_path": origin_file_path,
        "draft_file_path": d_r.draft_file_path,
        "draft_file_name": draft_file_name,
        "origin_file_version": d_r.origin_file_version,
        "publish_file_version": d_r.publish_file_version,
        "status": d_r.status,
        "permission": permission,
        "author": author_info['user_name'],
        "author_avatar_url": author_info['avatar_url'],
        "origin_file_exists": origin_file_exists,
        "draft_file_exists": draft_file_exists
        })
