# -*- coding: utf-8 -*-
import logging
from collections import defaultdict

from seahub.file_tags.models import FileTags


# Get an instance of a logger
logger = logging.getLogger(__name__)


def get_files_tags_in_dir(repo_id, path):

    # Get QuerySet from file_tags, repo_tags and file_uuid_map
    files_tags = FileTags.objects.get_dir_file_tags(repo_id, path).select_related('repo_tag', 'file_uuid')

    files_tags_in_dir = defaultdict(list)
    for file_tag in files_tags:
        file_tag_dict = dict()
        file_tag_dict['file_tag_id'] = file_tag.pk
        file_tag_dict['repo_tag_id'] = file_tag.repo_tag.pk
        file_tag_dict['tag_name'] = file_tag.repo_tag.name
        file_tag_dict['tag_color'] = file_tag.repo_tag.color
        files_tags_in_dir[file_tag.file_uuid.filename].append(file_tag_dict)

    return files_tags_in_dir
