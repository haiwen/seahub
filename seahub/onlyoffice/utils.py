import os
import json
import hashlib
import urlparse
import posixpath

from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.utils.encoding import force_bytes

from seaserv import seafile_api

from seahub.utils import get_file_type_and_ext, gen_file_get_url, \
        get_site_scheme_and_netloc

from seahub.settings import ENABLE_WATERMARK
from seahub.onlyoffice.settings import ONLYOFFICE_APIJS_URL, \
        ONLYOFFICE_FORCE_SAVE

def get_onlyoffice_dict(username, repo_id, file_path,
        file_id='', can_edit=False, can_download=True):

    repo = seafile_api.get_repo(repo_id)
    if repo.is_virtual:
        origin_repo_id = repo.origin_repo_id
        origin_file_path = posixpath.join(repo.origin_path, file_path.strip('/'))
        # for view history/trash/snapshot file
        if not file_id:
            file_id = seafile_api.get_file_id_by_path(origin_repo_id,
                    origin_file_path)
    else:
        origin_repo_id = repo_id
        origin_file_path = file_path
        if not file_id:
            file_id = seafile_api.get_file_id_by_path(repo_id,
                    file_path)

    dl_token = seafile_api.get_fileserver_access_token(repo_id,
            file_id, 'download', username, use_onetime=True)
    if not dl_token:
        return None

    filetype, fileext = get_file_type_and_ext(file_path)
    if fileext in ('xls', 'xlsx', 'ods', 'fods', 'csv'):
        document_type = 'spreadsheet'
    elif fileext in ('pptx', 'ppt', 'odp', 'fodp', 'ppsx', 'pps'):
        document_type = 'presentation'
    else:
        document_type = 'text'

    doc_info = json.dumps({'repo_id': repo_id, 'file_path': file_path, 'username': username})
    doc_key = hashlib.md5(force_bytes(origin_repo_id + origin_file_path + file_id)).hexdigest()[:20]
    cache.set("ONLYOFFICE_%s" % doc_key, doc_info, None)

    file_name = os.path.basename(file_path.rstrip('/'))
    doc_url = gen_file_get_url(dl_token, file_name)

    base_url = get_site_scheme_and_netloc()
    onlyoffice_editor_callback_url = reverse('onlyoffice_editor_callback')
    calllback_url = urlparse.urljoin(base_url, onlyoffice_editor_callback_url)

    return_dict = {
        'repo_id': repo_id,
        'path': file_path,
        'ONLYOFFICE_APIJS_URL': ONLYOFFICE_APIJS_URL,
        'file_type': fileext,
        'doc_key': doc_key,
        'doc_title': file_name,
        'doc_url': doc_url,
        'document_type': document_type,
        'callback_url': calllback_url,
        'can_edit': can_edit,
        'can_download': can_download,
        'username': username,
        'onlyoffice_force_save': ONLYOFFICE_FORCE_SAVE,
        'enable_watermark': ENABLE_WATERMARK and not can_edit,
    }

    return return_dict
