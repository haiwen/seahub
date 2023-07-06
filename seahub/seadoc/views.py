import os
from django.shortcuts import render
from django.utils.translation import gettext as _
from seaserv import get_repo
from seahub.auth.decorators import login_required
from seahub.utils import render_error
from seahub.views import check_folder_permission, validate_owner, get_seadoc_file_uuid
from seahub.tags.models import FileUUIDMap

from .utils import is_seadoc_revision, get_seadoc_download_link


@login_required
def sdoc_revision(request, repo_id):
    """List file revisions in file version history page.
    """
    repo = get_repo(repo_id)
    if not repo:
        error_msg = _("Library does not exist")
        return render_error(request, error_msg)

    # perm check
    if not check_folder_permission(request, repo_id, '/'):
        error_msg = _("Permission denied.")
        return render_error(request, error_msg)

    path = request.GET.get('p', '/')
    if not path:
        return render_error(request)

    if path[-1] == '/':
        path = path[:-1]

    u_filename = os.path.basename(path)

    # Check whether user is repo owner
    if validate_owner(request, repo_id):
        is_owner = True
    else:
        is_owner = False

    file_uuid = get_seadoc_file_uuid(repo, path)
    uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
    return_dict = {
        'repo': repo,
        'path': path,
        'u_filename': u_filename,
        'file_uuid': file_uuid,
        'is_owner': is_owner,
        'can_compare': True,
        'assets_url': '/api/v2.1/seadoc/download-image/' + file_uuid,
        'file_download_link': get_seadoc_download_link(uuid_map)
    }

    revision_info = is_seadoc_revision(file_uuid)
    return_dict.update(revision_info)

    origin_doc_uuid = return_dict.get('origin_doc_uuid', '')
    is_published = return_dict.get('is_published', False)
    if (origin_doc_uuid and not is_published):
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(origin_doc_uuid)
        return_dict['origin_file_download_link'] = get_seadoc_download_link(uuid_map)

    return render(request, 'sdoc_revision.html', return_dict)

