# -*- coding: utf-8 -*-
import logging
import posixpath
from collections import defaultdict
from django.db import connection

from seaserv import seafile_api

from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.file_tags.models import FileTags


# Get an instance of a logger
logger = logging.getLogger(__name__)


def get_files_tags_in_dir(repo_id, path):

    files_tags = FileTags.objects.get_dir_file_tags(repo_id, path)

    files_tags_in_dir = defaultdict(list)
    for file_tag in files_tags:
        file_tag_dict = dict()
        file_tag_dict['file_tag_id'] = file_tag[0]
        file_tag_dict['repo_tag_id'] = file_tag[1]
        file_tag_dict['tag_name'] = file_tag[2]
        file_tag_dict['tag_color'] = file_tag[3]
        files_tags_in_dir[file_tag[4]].append(file_tag_dict)

    return files_tags_in_dir


def get_tagged_files(repo, repo_tag_id):

    cursor = connection.cursor()
    cursor.execute('SELECT `file_tags_filetags`.`id`, `tags_fileuuidmap`.`parent_path`,'
                   '`tags_fileuuidmap`.`filename` FROM `file_tags_filetags` INNER JOIN'
                   '`repo_tags_repotags` ON (`file_tags_filetags`.`repo_tag_id` = `repo_tags_repotags`.`id`)'
                   'INNER JOIN `tags_fileuuidmap` ON (`file_tags_filetags`.`file_uuid` = `tags_fileuuidmap`.`uuid`)'
                   'WHERE `file_tags_filetags`.`repo_tag_id` = %s', (repo_tag_id, ))
    query_set = cursor.fetchall()

    tagged_files = defaultdict(list)
    for query in query_set:
        file_tag_id = query[0]
        parent_path = query[1]
        filename = query[2]
        file_path = posixpath.join(parent_path, filename)

        tagged_file = dict()
        file_obj = seafile_api.get_dirent_by_path(repo.store_id, file_path)
        if not file_obj:
            exception = "Can't find tagged file. Repo_id: %s, Path: %s." % (repo.id, file_path)
            logger.warning(exception)
            tagged_file["file_deleted"] = True
            tagged_file["file_tag_id"] = file_tag_id
            tagged_file["filename"] = filename
            tagged_files["tagged_files"].append(tagged_file)
            continue

        tagged_file["parent_path"] = parent_path
        tagged_file["filename"] = filename
        tagged_file["size"] = file_obj.size
        tagged_file["mtime"] = file_obj.mtime
        tagged_file["last_modified"] = timestamp_to_isoformat_timestr(file_obj.mtime)
        tagged_file["modifier_email"] = file_obj.modifier
        tagged_file["modifier_contact_email"] = email2contact_email(file_obj.modifier)
        tagged_file["modifier_name"] = email2nickname(file_obj.modifier)
        tagged_files["tagged_files"].append(tagged_file)

    return tagged_files
