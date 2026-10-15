import json
import logging
import os
import posixpath
import tempfile
import uuid
from zipfile import BadZipFile

from rest_framework.response import Response
from seaserv import seafile_api

from seahub.seadoc.settings import SDOC_IMAGES_DIR
from seahub.seadoc.utils import import_sdoc_zip
from seahub.tags.models import FileUUIDMap
from seahub.utils import get_no_duplicate_obj_name
from seahub.wiki2.utils import WIKI_PAGES_DIR, get_wiki_config, save_wiki_config, \
    get_current_level_page_ids, get_all_wiki_ids, gen_unique_id, gen_new_page_nav_by_id


logger = logging.getLogger(__name__)


def clean_up_sdoc_import(repo_id, username, page_info):
    if not page_info:
        return
    for directory in [posixpath.dirname(page_info['path']),
                      posixpath.join(SDOC_IMAGES_DIR, page_info['docUuid'])]:
        try:
            if seafile_api.get_dir_id_by_path(repo_id, directory):
                seafile_api.del_file(repo_id, posixpath.dirname(directory),
                                     json.dumps([posixpath.basename(directory)]), username)
        except Exception as e:
            logger.error(e)
    try:
        FileUUIDMap.objects.filter(uuid=page_info['docUuid']).delete()
    except Exception as e:
        logger.error(e)


def import_sdoc_wiki_page(wiki, username, file, from_page_id):
    repo_id = wiki.repo_id
    from_page_id = from_page_id or ''
    local_file_path = None
    save_started = False
    page_info = {}
    try:
        with tempfile.NamedTemporaryFile(suffix='.sdoczip', delete=False, mode='wb') as tmp_file:
            local_file_path = tmp_file.name
            for chunk in file.chunks():
                tmp_file.write(chunk)

        wiki_config = get_wiki_config(repo_id, username)
        navigation = wiki_config.get('navigation', [])
        doc_uuid = str(uuid.uuid4())
        filename = os.path.splitext(file.name)[0] + '.sdoc'
        page_info = {
            'page_id': gen_unique_id(get_all_wiki_ids(navigation)),
            'name': os.path.splitext(file.name)[0],
            'path': posixpath.join(WIKI_PAGES_DIR, doc_uuid, filename),
            'docUuid': doc_uuid,
        }
        import_sdoc_zip(repo_id, posixpath.dirname(page_info['path']),
                        posixpath.basename(page_info['path']), page_info['docUuid'], username, local_file_path)

        wiki_config = get_wiki_config(repo_id, username)
        navigation = wiki_config.get('navigation', [])
        is_find = [False]
        gen_new_page_nav_by_id(navigation, page_info['page_id'], from_page_id, 'inner', is_find)
        if not is_find[0]:
            clean_up_sdoc_import(repo_id, username, page_info)
            return Response({'error_msg': 'Current page does not exist'}, status=404)
        pages = wiki_config.get('pages', [])
        # The inserted page's siblings are the pages that share its name scope.
        page_ids = []
        get_current_level_page_ids(navigation, page_info['page_id'], page_ids)
        names = [page.get('name') for page in pages if page.get('id') in page_ids]
        page_info['name'] = get_no_duplicate_obj_name(page_info['name'], names)
        page = {
            'id': page_info['page_id'], 'name': page_info['name'], 'path': page_info['path'],
            'docUuid': page_info['docUuid'], 'icon': '', 'locked': False,
        }
        pages.append(page)
        if not wiki_config:
            wiki_config['version'] = 1
        wiki_config['pages'] = pages
        wiki_config['navigation'] = navigation
        # A failed response may still mean the config was saved; keep its assets.
        save_started = True
        save_wiki_config(wiki, username, json.dumps(wiki_config))
        return Response(dict(page_info, is_finished=True))
    except Exception as e:
        logger.error(e)
        if not save_started:
            clean_up_sdoc_import(repo_id, username, page_info)
        status = 400 if not save_started and isinstance(e, (BadZipFile, KeyError, ValueError)) else 500
        data = {'error_msg': 'file invalid.' if status == 400 else 'Internal Server Error'}
        return Response(data, status=status)
    finally:
        try:
            if local_file_path and os.path.exists(local_file_path):
                os.remove(local_file_path)
        except Exception as e:
            logger.warning(e)
