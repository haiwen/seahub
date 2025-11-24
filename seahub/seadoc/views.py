import os
import json
import logging
import jwt
from urllib.parse import quote
from django.shortcuts import render
from django.http import HttpResponse
from django.template import loader
from django.utils.translation import gettext as _

from seaserv import get_repo, seafile_api

from seahub.auth.decorators import login_required
from seahub.settings import JWT_PRIVATE_KEY
from seahub.utils import render_error, normalize_file_path, gen_file_get_url
from seahub.views import check_folder_permission, validate_owner, get_seadoc_file_uuid
from seahub.tags.models import FileUUIDMap
from seahub.seadoc.models import SeadocRevision

from seahub.api2.endpoints.utils import sdoc_export_to_docx
from .utils import is_seadoc_revision, get_seadoc_download_link, gen_path_link


logger = logging.getLogger(__name__)

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


@login_required
def sdoc_revisions(request, repo_id):
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
    filename = os.path.basename(path)

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '100'))
    except ValueError:
        current_page = 1
        per_page = 100

    start = per_page * (current_page - 1)
    limit = per_page + 1

    file_uuid = get_seadoc_file_uuid(repo, path)
    origin_uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)

    revision_queryset = SeadocRevision.objects.list_by_origin_doc_uuid(origin_uuid_map.uuid, start, limit)
    count = SeadocRevision.objects.filter(origin_doc_uuid=origin_uuid_map.uuid).count()
    zipped = gen_path_link(path, repo.name)
    extra_href = "&p=%s" % quote(path)

    uuid_set = set()
    for item in revision_queryset:
        uuid_set.add(item.doc_uuid)
        uuid_set.add(item.origin_doc_uuid)

    fileuuidmap_queryset = FileUUIDMap.objects.filter(uuid__in=list(uuid_set))
    revisions = [revision.to_dict(fileuuidmap_queryset) for revision in revision_queryset]

    if len(revisions) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render(request, 'sdoc_revisions.html', {
        'repo': repo,
        'revisions': json.dumps(revisions),
        'count': count,
        'docUuid': file_uuid,
        'path': path,
        'filename': filename,
        'zipped': json.dumps(zipped),
        'extra_href': extra_href,
        'current_page': current_page,
        'prev_page': current_page - 1,
        'next_page': current_page + 1,
        'per_page': per_page,
        'page_next': page_next,
    })


@login_required
def sdoc_to_docx(request, repo_id):

    # argument check
    file_path = request.GET.get('file_path')
    file_path = normalize_file_path(file_path)
    if not file_path:
        error_msg = _("File path invalid.")
        return render_error(request, error_msg)

    # resource check
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        error_msg = _("Library does not exist")
        return render_error(request, error_msg)

    file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
    if not file_id:
        error_msg = 'File %s not found.' % file_path
        return render_error(request, error_msg)

    # permission check
    if not check_folder_permission(request, repo_id, '/'):
        error_msg = _("Permission denied.")
        return render_error(request, error_msg)

    username = request.user.username
    filename = os.path.basename(file_path)
    doc_uuid = get_seadoc_file_uuid(repo, file_path)
    download_token = seafile_api.get_fileserver_access_token(repo_id, file_id,
                                                             'download', username)
    download_url = gen_file_get_url(download_token, filename)

    src_type = 'sdoc'
    dst_type = 'docx'
    resp_with_docx_file = sdoc_export_to_docx(file_path, username, doc_uuid,
                                              download_url, src_type, dst_type)

    docx_mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    response = HttpResponse(content_type=docx_mime_type)
    new_file_name = quote(f'{filename[:-5]}.docx')
    response['Content-Disposition'] = f'attachment; filename={new_file_name}'
    response.write(resp_with_docx_file.content)
    return response


def sdoc_preview(request, repo_id, file_uuid):
    repo = get_repo(repo_id)
    if not repo:
        error_msg = _("Library does not exist")
        logger.warning(f'Sdoc preview failed: {error_msg}')
        return render_error(request, error_msg)
    
    access_token = request.GET.get('access_token')
    if not access_token:
        error_msg = 'Token cannot be empty.'
        logger.warning(f'Sdoc preview failed: {error_msg}')
        return render_error(request, error_msg)
    try:
        payload = jwt.decode(access_token, JWT_PRIVATE_KEY, algorithms=['HS256'])
        if payload.get('file_uuid') != file_uuid:
            error_msg = 'Permission denied.'
            logger.warning(f'Sdoc preview failed: {error_msg}')
            return render_error(request, error_msg)
    except:
        error_msg = 'Token invalid.'
        logger.warning(f'Sdoc preview failed: {error_msg}')
        return render_error(request, error_msg)

    uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
    return_dict = {
        'repo': repo,
        'file_uuid': file_uuid,
        'can_compare': True,
        'assets_url': '/api/v2.1/seadoc/download-image/' + file_uuid,
        'file_download_link': get_seadoc_download_link(uuid_map)
    }

    return render(request, 'sdoc_preview.html', return_dict)



