# -*- coding: utf-8 -*-
import logging
from collections import defaultdict

from seahub.file_tags.models import FileTags


# Get an instance of a logger
logger = logging.getLogger(__name__)


def get_dir_tags_dict(repo_id, path):

    # Get QuerySet from file_tags, repo_tags and file_uuid_map
    file_tags = FileTags.objects.get_dir_file_tags(repo_id, path).select_related('repo_tag', 'file_uuid')

    dir_tags_dict = defaultdict(list)
    for file_tag in file_tags:
        dir_tags_dict[file_tag.file_uuid.filename].append(file_tag)

    return dir_tags_dict
