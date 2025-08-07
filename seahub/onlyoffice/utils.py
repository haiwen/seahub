import os
import hashlib
import logging
import urllib.parse
import posixpath
import time
from django.urls import reverse
from django.utils.encoding import force_bytes

from seaserv import seafile_api

from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.utils import get_file_type_and_ext, gen_file_get_url, \
        get_site_scheme_and_netloc

from seahub.onlyoffice.models import OnlyOfficeDocKey

from seahub.settings import ENABLE_WATERMARK
from seahub.onlyoffice.settings import ONLYOFFICE_APIJS_URL, \
        ONLYOFFICE_FORCE_SAVE, ONLYOFFICE_JWT_SECRET, \
        ONLYOFFICE_DESKTOP_EDITOR_HTTP_USER_AGENT, \
        ONLYOFFICE_EXT_WORD, ONLYOFFICE_EXT_CELL, \
        ONLYOFFICE_EXT_SLIDE, ONLYOFFICE_EXT_PDF, ONLYOFFICE_EXT_DIAGRAM

# Get an instance of a logger
logger = logging.getLogger('onlyoffice')


def generate_onlyoffice_doc_key(repo_id, file_path, file_id):

    info_bytes = force_bytes(repo_id + file_path + file_id)
    doc_key = hashlib.md5(info_bytes).hexdigest()[:20]

    logger.info('generate new doc_key {} by repo_id {} file_path {} file_id {}'.format(doc_key,
                                                                                       repo_id,
                                                                                       file_path,
                                                                                       file_id))
    return doc_key


def get_doc_key_by_repo_id_file_path(repo_id, file_path):

    md5 = hashlib.md5(force_bytes(repo_id + file_path)).hexdigest()
    try:
        doc_key_obj = OnlyOfficeDocKey.objects.filter(repo_id_file_path_md5=md5).first()
        if doc_key_obj:
            return doc_key_obj.doc_key
        return ''
    except Exception as e:
        logger.error(e)
        return ''


def get_file_info_by_doc_key(doc_key):

    try:
        doc_key_obj = OnlyOfficeDocKey.objects.filter(doc_key=doc_key).first()
        if doc_key_obj:
            return {
                'username': doc_key_obj.username,
                'repo_id': doc_key_obj.repo_id,
                'file_path': doc_key_obj.file_path,
            }
        return {}
    except Exception as e:
        logger.error(e)
        return {}


def save_doc_key(doc_key, username, repo_id, file_path):

    md5 = hashlib.md5(force_bytes(repo_id + file_path)).hexdigest()
    try:
        doc_key_obj = OnlyOfficeDocKey.objects.create(doc_key=doc_key,
                                                      username=username,
                                                      repo_id=repo_id,
                                                      file_path=file_path,
                                                      repo_id_file_path_md5=md5)
    except Exception as e:
        logger.error(e)
        return

    return doc_key_obj.doc_key


def delete_doc_key(doc_key):

    OnlyOfficeDocKey.objects.filter(doc_key=doc_key).delete()


def get_onlyoffice_dict(request, username, repo_id, file_path, file_id='',
                        can_edit=False, can_download=True, can_copy=True):

    logger.info('{} open file {} in repo {} with can_edit {}'.format(username, file_path, repo_id, can_edit))

    repo = seafile_api.get_repo(repo_id)
    if repo.is_virtual:
        origin_repo_id = repo.origin_repo_id
        origin_file_path = posixpath.join(repo.origin_path,
                                          file_path.strip('/'))
    else:
        origin_repo_id = repo_id
        origin_file_path = file_path

    # for view history/trash/snapshot file
    if not file_id:
        file_id = seafile_api.get_file_id_by_path(origin_repo_id,
                                                  origin_file_path)

    dl_token = seafile_api.get_fileserver_access_token(repo_id,
                                                       file_id,
                                                       'download',
                                                       username,
                                                       use_onetime=False)
    if not dl_token:
        return None

    filetype, fileext = get_file_type_and_ext(file_path)

    if fileext in ONLYOFFICE_EXT_WORD:
        document_type = 'word'
    elif fileext in ONLYOFFICE_EXT_CELL:
        document_type = 'cell'
    elif fileext in ONLYOFFICE_EXT_SLIDE:
        document_type = 'slide'
    elif fileext in ONLYOFFICE_EXT_PDF:
        document_type = 'pdf'
    elif fileext in ONLYOFFICE_EXT_DIAGRAM:
        document_type = 'diagram'
    else:
        document_type = 'unknown'

    if not can_edit:
        doc_key = generate_onlyoffice_doc_key(origin_repo_id, origin_file_path, file_id)
    else:
        doc_key = get_doc_key_by_repo_id_file_path(origin_repo_id, origin_file_path)
        if doc_key:
            logger.info('get doc_key {} from database by repo_id {} file_path {}'.format(doc_key,
                                                                                         origin_repo_id,
                                                                                         origin_file_path))
        else:
            doc_key = generate_onlyoffice_doc_key(origin_repo_id, origin_file_path, file_id)
            save_doc_key(doc_key, username, origin_repo_id, origin_file_path)
            logger.info('save doc_key {} to database'.format(doc_key))

    # for render onlyoffice html
    file_name = os.path.basename(file_path.rstrip('/'))
    doc_url = gen_file_get_url(dl_token, file_name)

    base_url = get_site_scheme_and_netloc()
    onlyoffice_editor_callback_url = reverse('onlyoffice_editor_callback')
    callback_url = urllib.parse.urljoin(base_url, onlyoffice_editor_callback_url)
    avatar_url, _, _ = api_avatar_url(username)
    import jwt

    http_user_agent = request.headers.get('user-agent', '')

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
        'can_copy': can_copy,
        'username': username,
        'avatar_url': avatar_url,
        'onlyoffice_force_save': ONLYOFFICE_FORCE_SAVE and can_edit,
        'enable_watermark': ENABLE_WATERMARK,
        'request_from_onlyoffice_desktop_editor': ONLYOFFICE_DESKTOP_EDITOR_HTTP_USER_AGENT in http_user_agent,
        'file_key': jwt.encode({
            'repo_id': origin_repo_id,
            'file_path': origin_file_path,

        }, ONLYOFFICE_JWT_SECRET),
        'instance_id': base_url,
    }

    if ONLYOFFICE_JWT_SECRET:

        config = {
            "document": {
                "fileType": fileext,
                "key": doc_key,
                "title": file_name,
                "url": doc_url,
                "permissions": {
                    "download": can_download,
                    "edit": can_edit,
                    "fillForms": can_edit,
                    "copy": can_copy,
                    "print": can_download,
                    "review": can_edit
                }
            },
            "documentType": document_type,
            "editorConfig": {
                "callbackUrl": callback_url,
                "lang": request.LANGUAGE_CODE,
                "mode": 'edit' if can_edit else 'view',
                "customization": {
                    "forcesave": ONLYOFFICE_FORCE_SAVE and can_edit,
                    "submitForm": can_edit
                },
            },
            'exp': int(time.time()) + 3 * 24 * 3600
        }

        if request.user.is_authenticated:
            user_dict = {
                "id": username,
                "name": email2nickname(username),
                "avatar_url": avatar_url,
            }
            config['editorConfig']['user'] = user_dict
        else:
            anonymous_dict = {
                "request": True,
                "label": "Guest"
            }
            config['editorConfig']['customization']['anonymous'] = anonymous_dict

        return_dict['onlyoffice_jwt_token'] = jwt.encode(config, ONLYOFFICE_JWT_SECRET)

    return return_dict
