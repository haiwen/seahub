import json
import logging
import posixpath
import stat
from django.http import HttpResponse
from seaserv import seafile_api

from seahub.api2.utils import api_error, get_file_size
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.utils import is_pro_version, normalize_file_path
from seahub.utils.file_tags import get_files_tags_in_dir
from seahub.utils.star import get_dir_starred_files
from pysearpc import SearpcError

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'
HTTP_520_OPERATION_FAILED = 520


def permission_check_admin_owner(username, repo_id):  # maybe add more complex logic in the future
    return username == seafile_api.get_repo_owner(repo_id)


def get_dir_entrys_by_id_and_api_token(request, repo, path, dir_id, request_type=None):
    """ Get dirents in a dir

    if request_type is 'f', only return file list,
    if request_type is 'd', only return dir list,
    else, return both.
    """
    username = request.boss_behind.username
    try:
        dirs = seafile_api.list_dir_with_perm(repo.id, path, dir_id,
                username, -1, -1)
        dirs = dirs if dirs else []
    except SearpcError as e:
        logger.error(e)
        return api_error(HTTP_520_OPERATION_FAILED,
                         "Failed to list dir.")

    dir_list, file_list = [], []
    for dirent in dirs:
        entry = {}
        if stat.S_ISDIR(dirent.mode):
            dtype = "dir"
        else:
            dtype = "file"
            entry['modifier_email'] = dirent.modifier
            if repo.version == 0:
                entry["size"] = get_file_size(repo.store_id, repo.version,
                                              dirent.obj_id)
            else:
                entry["size"] = dirent.size
            if is_pro_version():
                entry["is_locked"] = dirent.is_locked
                entry["lock_owner"] = dirent.lock_owner
                if dirent.lock_owner:
                    entry["lock_owner_name"] = email2nickname(dirent.lock_owner)
                entry["lock_time"] = dirent.lock_time
                if username == dirent.lock_owner:
                    entry["locked_by_me"] = True
                else:
                    entry["locked_by_me"] = False

        entry["type"] = dtype
        entry["name"] = dirent.obj_name
        entry["id"] = dirent.obj_id
        entry["mtime"] = dirent.mtime
        entry["permission"] = dirent.permission
        if dtype == 'dir':
            dir_list.append(entry)
        else:
            file_list.append(entry)

    # Use dict to reduce memcache fetch cost in large for-loop.
    contact_email_dict = {}
    nickname_dict = {}
    modifiers_set = {x['modifier_email'] for x in file_list}
    for e in modifiers_set:
        if e not in contact_email_dict:
            contact_email_dict[e] = email2contact_email(e)
        if e not in nickname_dict:
            nickname_dict[e] = email2nickname(e)

    starred_files = get_dir_starred_files(username, repo.id, path)
    files_tags_in_dir = get_files_tags_in_dir(repo.id, path)

    for e in file_list:
        e['modifier_contact_email'] = contact_email_dict.get(e['modifier_email'], '')
        e['modifier_name'] = nickname_dict.get(e['modifier_email'], '')

        file_tags = files_tags_in_dir.get(e['name'])
        if file_tags:
            e['file_tags'] = []
            for file_tag in file_tags:
                e['file_tags'].append(file_tag)
        file_path = posixpath.join(path, e['name'])
        e['starred'] = False
        if normalize_file_path(file_path) in starred_files:
            e['starred'] = True

    dir_list.sort(key=lambda x: x['name'].lower())
    file_list.sort(key=lambda x: x['name'].lower())

    if request_type == 'f':
        dentrys = file_list
    elif request_type == 'd':
        dentrys = dir_list
    else:
        dentrys = dir_list + file_list

    response = HttpResponse(json.dumps(dentrys), status=200,
                            content_type=json_content_type)
    response["oid"] = dir_id
    response["dir_perm"] = seafile_api.check_permission_by_path(repo.id, path, username)
    return response
