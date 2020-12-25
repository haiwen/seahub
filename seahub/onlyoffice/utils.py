import os
import json
import hashlib
import logging
import urllib.parse
import posixpath

from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.utils.encoding import force_bytes

from seaserv import seafile_api

from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils import get_file_type_and_ext, gen_file_get_url, \
        get_site_scheme_and_netloc, normalize_cache_key
from seahub.utils.file_op import if_locked_by_online_office

from seahub.settings import ENABLE_WATERMARK
from seahub.onlyoffice.settings import ONLYOFFICE_APIJS_URL, \
        ONLYOFFICE_FORCE_SAVE, ONLYOFFICE_JWT_SECRET

# Get an instance of a logger
logger = logging.getLogger(__name__)


def generate_onlyoffice_cache_key(repo_id, file_path):
    prefix = "ONLYOFFICE_"
    value = "%s_%s" % (repo_id, file_path)
    return normalize_cache_key(value, prefix)


def get_onlyoffice_dict(request, username, repo_id, file_path, file_id='',
                        can_edit=False, can_download=True):

    repo = seafile_api.get_repo(repo_id)
    if repo.is_virtual:
        origin_repo_id = repo.origin_repo_id
        origin_file_path = posixpath.join(repo.origin_path,
                                          file_path.strip('/'))
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
                                                       file_id,
                                                       'download',
                                                       username,
                                                       use_onetime=True)
    if not dl_token:
        return None

    filetype, fileext = get_file_type_and_ext(file_path)
    if fileext in ('xls', 'xlsx', 'ods', 'fods', 'csv'):
        document_type = 'spreadsheet'
    elif fileext in ('pptx', 'ppt', 'odp', 'fodp', 'ppsx', 'pps'):
        document_type = 'presentation'
    else:
        document_type = 'text'

    cache_key = generate_onlyoffice_cache_key(repo_id, file_path)
    doc_key = cache.get(cache_key)

    # temporary solution when failed to get data from cache(django_pylibmc)
    # when init process for the first time
    if not doc_key:
        doc_key = cache.get(cache_key)

    if not doc_key and if_locked_by_online_office(repo_id, file_path):
        logger.error('no doc_key in cache and locked by online office')

    if not doc_key:
        info_bytes = force_bytes(origin_repo_id + origin_file_path + file_id)
        doc_key = hashlib.md5(info_bytes).hexdigest()[:20]

    doc_info = json.dumps({'repo_id': repo_id,
                           'file_path': file_path,
                           'username': username})
    cache.set("ONLYOFFICE_%s" % doc_key, doc_info, None)

    file_name = os.path.basename(file_path.rstrip('/'))
    doc_url = gen_file_get_url(dl_token, file_name)

    base_url = get_site_scheme_and_netloc()
    onlyoffice_editor_callback_url = reverse('onlyoffice_editor_callback')
    callback_url = urllib.parse.urljoin(base_url,
                                        onlyoffice_editor_callback_url)

    return_dict = {
        'repo_id': repo_id,
        'path': file_path,
        'ONLYOFFICE_APIJS_URL': ONLYOFFICE_APIJS_URL,
        'file_type': fileext,
        'doc_key': doc_key,
        'doc_title': file_name,
        'doc_url': doc_url,
        'document_type': document_type,
        'callback_url': callback_url,
        'can_edit': can_edit,
        'can_download': can_download,
        'username': username,
        'onlyoffice_force_save': ONLYOFFICE_FORCE_SAVE,
        'enable_watermark': ENABLE_WATERMARK and not can_edit,
    }

    if ONLYOFFICE_JWT_SECRET:
        import jwt
        config = {
            "document": {
                "fileType": fileext,
                "key": doc_key,
                "title": file_name,
                "url": doc_url,
                "permissions": {
                    "download": can_download,
                    "edit": can_edit,
                    "print": can_download,
                    "review": True
                }
            },
            "documentType": document_type,
            "editorConfig": {
                "callbackUrl": callback_url,
                "lang": request.LANGUAGE_CODE,
                "mode": can_edit,
                "customization": {
                    "forcesave": ONLYOFFICE_FORCE_SAVE,
                },
                "user": {
                    "name": email2nickname(username)
                }
            }
        }

        return_dict['onlyoffice_jwt_token'] = jwt.encode(config,
                                                         ONLYOFFICE_JWT_SECRET)

    return return_dict
