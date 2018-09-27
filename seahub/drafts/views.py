# -*- coding: utf-8 -*-

import posixpath
from django.shortcuts import render, get_object_or_404
from django.utils.translation import ugettext as _

from seahub.auth.decorators import login_required
from seahub.views import check_folder_permission
from seahub.utils import render_permission_error
from seahub.drafts.models import Draft

@login_required
def drafts(request):
    return render(request, "react_app.html")


@login_required
def review(request, pk):
    d = get_object_or_404(Draft, pk=pk)

    #check perm
    uuid = d.origin_file_uuid
    file_path = posixpath.join(uuid.parent_path, uuid.filename)

    if request.user.username:
        permission = check_folder_permission(request, d.origin_repo_id, file_path)

    if permission is None:
        return render_permission_error(request, _(u'Permission denied.'))

    return render(request, "draft_review.html", {
        "id": pk,
        "draft_repo_id": d.draft_repo_id,
        "draft_file_path": d.draft_file_path
        })
