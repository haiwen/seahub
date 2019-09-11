# -*- coding: utf-8 -*-
import os

from django.http import Http404, HttpResponseRedirect
from django.shortcuts import render
from django.utils.translation import ugettext as _
from seaserv import seafile_api

from seahub.dtable.models import Workspaces, DTables
from seahub.utils import normalize_file_path, render_error, render_permission_error, \
    gen_file_get_url
from seahub.auth.decorators import login_required
from seahub.settings import SHARE_LINK_EXPIRE_DAYS_MIN, SHARE_LINK_EXPIRE_DAYS_MAX, \
    SHARE_LINK_EXPIRE_DAYS_DEFAULT, DTABLE_SERVER_URL, SEAFILE_COLLAB_SERVER, MEDIA_URL
from seahub.dtable.utils import check_dtable_share_permission, check_dtable_permission
from seahub.constants import PERMISSION_ADMIN, PERMISSION_READ_WRITE


FILE_TYPE = '.dtable'
WRITE_PERMISSION_TUPLE = (PERMISSION_READ_WRITE, PERMISSION_ADMIN)


@login_required
def dtable_file_view(request, workspace_id, name):
    """

    Permission:
    1. owner
    2. group member
    3. shared user
    """
    # resource check
    workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
    if not workspace:
        raise Http404

    repo_id = workspace.repo_id
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    dtable = DTables.objects.get_dtable(workspace, name)
    if not dtable:
        return render_error(request, _('Table does not exist'))

    table_file_name = name + FILE_TYPE
    table_path = normalize_file_path(table_file_name)
    table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
    if not table_file_id:
        return render_error(request, _('Table does not exist'))

    # permission check
    username = request.user.username
    owner = workspace.owner
    if not check_dtable_permission(username, owner) and \
            not check_dtable_share_permission(dtable, username):
        return render_permission_error(request, _('Permission denied.'))

    return_dict = {
        'share_link_expire_days_default': SHARE_LINK_EXPIRE_DAYS_DEFAULT,
        'share_link_expire_days_min': SHARE_LINK_EXPIRE_DAYS_MIN,
        'share_link_expire_days_max': SHARE_LINK_EXPIRE_DAYS_MAX,
        'repo': repo,
        'filename': name,
        'path': table_path,
        'filetype': 'dtable',
        'workspace_id': workspace_id,
        'dtable_uuid': dtable.uuid.hex,
        'media_url': MEDIA_URL,
        'dtable_server': DTABLE_SERVER_URL,
        'dtable_socket': SEAFILE_COLLAB_SERVER
    }

    return render(request, 'dtable_file_view_react.html', return_dict)


@login_required
def dtable_asset_access(request, workspace_id, dtable_id, path):
    """

    Permission:
    1. owner
    2. group member
    3. shared user with `rw` or `admin` permission
    """
    asset_name = os.path.basename(normalize_file_path(path))

    # resource check
    workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
    if not workspace:
        raise Http404

    repo_id = workspace.repo_id
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    dtable = DTables.objects.get_dtable_by_uuid(dtable_id)
    if not dtable:
        raise Http404

    asset_path = normalize_file_path(os.path.join('/asset', dtable_id, path))
    asset_id = seafile_api.get_file_id_by_path(repo_id, asset_path)
    if not asset_id:
        raise Http404

    # permission check
    username = request.user.username
    owner = workspace.owner
    if not check_dtable_permission(username, owner) and \
            check_dtable_share_permission(dtable, username) not in WRITE_PERMISSION_TUPLE:
        return render_permission_error(request, _('Permission denied.'))

    dl = request.GET.get('dl', '0') == '1'
    operation = 'download' if dl else 'view'

    token = seafile_api.get_fileserver_access_token(
        repo_id, asset_id, operation, '', use_onetime=False
    )

    url = gen_file_get_url(token, asset_name)

    return HttpResponseRedirect(url)
